"use client";

import { useState } from 'react';
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"
import { Share1Icon, HeartIcon, Share2Icon, ChatBubbleIcon } from '@radix-ui/react-icons';

interface PostProps {
  avatar: string;
  name: string;
  createdAt: string;
}

const Post: React.FC<PostProps> = ({ avatar, name, createdAt }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhoto(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center mb-4">
        <Avatar>
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="ml-2">
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-gray-500">{createdAt}</p>
        </div>
        <Button variant="ghost" className="ml-auto">
          Follow
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e:any) => setTitle(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="photo" className="cursor-pointer">
          <Share2Icon className="text-gray-500" />
          <span className="ml-2 text-gray-500">Upload Photo</span>
          <input
            id="photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>
        {photo && (
          <div className="mt-2">
            <img src={URL.createObjectURL(photo)} alt="Uploaded" className="max-w-full h-auto" />
          </div>
        )}
      </div>

      <div className="mb-4">
        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e:any) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button variant="ghost" className="mr-2">
          <HeartIcon className="mr-2" />
          Like
        </Button>
        <Button variant="ghost" className="mr-2">
          <ChatBubbleIcon className="mr-2" />
          Comment
        </Button>
        <Button variant="ghost">
          <Share1Icon className="mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
};

export default Post;