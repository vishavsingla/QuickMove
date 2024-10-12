import Navbar from '@/app/components/Navbar'
import Post from '@/app/components/Post'
import { cookies } from 'next/headers';
import { getCookie } from 'cookies-next';
import React from 'react'

export default function Home() {
  const sessionToken = getCookie('sessionToken', {cookies});
  return (
    <div className='space-y-10'>
      <Navbar sessionToken={sessionToken || ''} />
      <div className="mx-20 px-20">
        <Post avatar='' name='Shyam' createdAt=''/>
      </div>
    </div>
  )
}
