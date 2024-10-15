
import Home from "./(pages)/(home)/page";
import { cookies } from 'next/headers';
import { getCookie } from 'cookies-next';
const sessionToken = getCookie('sessionToken', {cookies});


function page() {

  return (
    <div className="">
   
      <Home/>
      
    </div>
  );
}
export default page
