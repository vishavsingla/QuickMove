
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { Session } from 'inspector';


const prisma = new PrismaClient();

const signUpController = async (req: Request, res: Response): Promise<Response> => {
	try {
		const { name, email, password, phoneNumber } = req.body;
		if (!email || !password || !name || !phoneNumber) {
			return res.status(203).json({ message: "Please provide all required fields" });
		}

		const existingUser = await prisma.user.findUnique({
			where: {
				email: email,
			},
		});

		if (existingUser) {
			return res.status(203).json({ message: "User already exists" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: { name, email, hashedPassword, phoneNumber},
		});

		const verificationToken = await prisma.verificationToken.create({
			data: {
				identifier: user.email || '',
				token: generateVerificationToken(),
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
				userId: user.id,
			},
		});

		return res
			.status(200)
			.json({ message: "User registered successfully", user, verificationToken });
	} catch (err: any) {
		return res
			.status(203)
			.json({ message: "Internal server error", error: err.message });
	}
};

const loginController = async (req: Request, res: Response): Promise<Response> => {
	try {
		const { email, password } = req.body;
		
		const existingUser = await prisma.user.findUnique({
			where: {
				email,
			},
		});

		if (!existingUser) {
			return res.status(203).json({ message: "User not found" });
		}

		const matched = await bcrypt.compare(password, existingUser.hashedPassword);

		if (!matched) {
			return res.status(203).json({ message: "Incorrect password" });
		}

		const accessToken = generateAccessToken({
			id: existingUser.id,
		});

		const refreshToken = generateRefreshToken({
			id: existingUser.id,
		});

		const sessionToken = generateSessionToken();

		res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, path: '/', });
		res.cookie('sessionToken', sessionToken, { httpOnly: true, secure: false, path: '/', });
		
	
		const full_session = await prisma.session.create({
			data: {
				accessToken: accessToken,
				refreshToken: refreshToken,
				sessionToken: sessionToken,
				userId: existingUser.id,
				expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});

		const { refreshToken: refreshTokenValue, ...session } = full_session;

		return res
			.status(200)
			.json({ message: "Login successful", accessToken, session });
	} catch (err: any) {
		return res
			.status(203)
			.json({ message: "Internal server error", details: err.message });
	}
};

export const extractSessionToken = (req: Request, res: Response) => {
	const tokens = req.headers['cookie']?.split(';');
	const session = tokens?.find(token => token.includes("sessionToken="));
	const sessionToken = session ? session.split('=')[1] : null;
	return sessionToken;
};

const fetchUserFromSession = async (req: Request, res: Response) => {
    const sessionToken = extractSessionToken(req, res);
    
    if (!sessionToken) {
        return null; 
    }
    
    const session = await prisma.session.findUnique({
        where: {
            sessionToken: sessionToken,
        },
        include: {
            user: true, 
        },
    });

    return session ? session.user : null; 
};


const refreshAccessTokenController = async (req: Request, res: Response): Promise<Response> => {

	const sessionToken = extractSessionToken(req, res);
	try {
		if (!sessionToken) return res.status(401).json({ error: "Not Logged In" });
		const session = await prisma.session.findUnique({
			where: {
				sessionToken
			}
		})

		if (!session) {
			return res.status(401).json({ error: 'Invalid session' });
		}

		const refreshToken = session.refreshToken || "";

		const privateKey = process.env.REFRESH_TOKEN_PRIVATE_KEY || "";

		const decoded: any = jwt.verify(refreshToken, privateKey as string);
		const id = decoded.id;

		const newAccessToken = generateAccessToken({ id });
		const newSessionToken = generateSessionToken();
		console.log(newAccessToken)
		await prisma.session.updateMany({
			where: {
				sessionToken: sessionToken
			},
			data: {
				accessToken: newAccessToken,
				sessionToken: newSessionToken,
				expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});
		res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: false, path: '/', });
		res.cookie('sessionToken', newSessionToken, { httpOnly: true, secure: false, path: '/', });
			
		return res.status(201).json({
			message: 'Token refreshed successfully',
			accessToken: newAccessToken,
			sessionToken: newSessionToken,
		});
	} catch (err: any) {
		return res.status(401).json({ error: 'Invalid refresh token', details: err.message });
	}
};

const logOutController = async (req: Request, res: Response): Promise<Response> => {
	const sessionToken = extractSessionToken(req, res);
	try {
		if (!sessionToken) return res.status(401).json({ error: "Not Logged In" });

		if (!sessionToken) {
			return res.status(400).json({ error: "session not available" });
		}

		await prisma.session.delete({
			where: {
				sessionToken
			},
		});

		res.clearCookie('accessToken', {  domain:'localhost', path: '/', });
		res.clearCookie('sessionToken', { domain:'localhost', path: '/', });

		return res.status(200).json({ message: "Logged out successfully" });
	} catch (e: any) {
		return res
			.status(500)
			.json({ error: "Internal server error", details: e.message });
	}
};

const generateAccessToken = (data: any): string => {
	try {
		const token = jwt.sign(data, process.env.ACCESS_TOKEN_PRIVATE_KEY as string, {
			expiresIn: "1min",
		});
		return token;
	} catch (e: any) {
		throw new Error("Failed to generate refresh token: " + e.message);
	}
};

const generateRefreshToken = (data: any): string => {
	try {
		const token = jwt.sign(data, process.env.REFRESH_TOKEN_PRIVATE_KEY as string, {
			expiresIn: "1d",
		});
		return token;
	} catch (e: any) {
		throw new Error("Failed to generate refresh token: " + e.message);
	}
};

const generateVerificationToken = (): string => {
	return Math.random().toString(36).substring(2, 10);
};

const generateSessionToken = (): string => {
	return Math.random().toString(36).substring(2, 10);
};

const checkValidSession = async (req: Request, res: Response): Promise<Response> => {
	const sessionToken = extractSessionToken(req, res);
	try {
		if (!sessionToken) return res.status(401).json({ error: "Not Logged In" });
		const thisSession = await prisma.session.findUnique({
			where: { sessionToken },
		});
		if (thisSession) return res.status(200).json({ success: "Is Logged In" });
		return res.status(401).json({ error: "Not Logged In" });
	} catch (e: any) {
		return res.status(500).json({ error: "Session Expired", details: e.message });
	}
};

const getUserDetails = async (req: Request, res: Response): Promise<Response> => {
	console.log(req.params)
	const sessionToken = req.params.sessionToken || extractSessionToken(req, res);
	console.log(sessionToken)
	try {
		if (!sessionToken) return res.status(200).json({ error: "Not Logged In" });
		const thisSession: any = await prisma.session.findUnique({
			where: { sessionToken: sessionToken },
		});
		const thisUser = await prisma.user.findUnique({
			where: {
				id: thisSession.userId,
			},
		});
		if (thisUser) return res.status(200).send(thisUser);
		else return res.status(500).json({ error: 'No user found' });
	} catch (e: any) {
		return res.status(500).json({ error: 'Session Expired', details: e.message });
	}
};

export {
	signUpController,
	loginController,
	logOutController,
	refreshAccessTokenController,
	checkValidSession,
	getUserDetails,
	fetchUserFromSession
};
