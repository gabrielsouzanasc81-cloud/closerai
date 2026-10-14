import {redirect} from 'next/navigation';
import {serverClient} from '@/lib/supabase/server';
import Shell from '../shell';
import Atendimento from './atendimento';
export default async function Page(){
 const db=await serverClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login');
 return <Shell><Atendimento userId={user.id}/></Shell>;
}
