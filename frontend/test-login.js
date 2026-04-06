import { signInWithPassword } from './src/lib/supabase.js';

let [email, password] = process.argv.slice(2);
if (!email) email = 'test@example.com';
if (!password) password = 'password123';

console.log('Testing login', email, password);

signInWithPassword({ email, password }).then(res => {
  console.log('Success:', res);
}).catch(err => {
  console.error('Error:', err.message);
  console.error(err);
});
