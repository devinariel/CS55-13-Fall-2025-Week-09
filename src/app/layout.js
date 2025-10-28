import "./styles.css";
import Header from "../components/Header.jsx";
import { getAuthenticatedAppForUser } from "../lib/firebase/serverApp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Therapy Compass",
  description: "Find clinicians, read verified patient reviews.",
};

export default async function RootLayout({ children }) {
  const { currentUser } = await getAuthenticatedAppForUser();
  return (
    <html lang="en">
      <body className="bg-[#FCE0C0] text-[#212C1B]">
        <Header initialUser={currentUser?.toJSON()} />
        <main>{children}</main>
      </body>
    </html>
  );
}
// layout implemented directly in this file for JSX usage 
// since Header needs a hook and can't be a server component
