import {redirect} from 'next/navigation';
import {serverClient} from '@/lib/supabase/server';
import Shell from '../shell';
import Module from '../shared/module';
export default async function Page(){const db=await serverClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');return <Shell><Module kind="contacts" userId={user.id}/></Shell>}
