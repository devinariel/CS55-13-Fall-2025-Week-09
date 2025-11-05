import "./styles.css";
import Header from "../components/Header.jsx";
import ConsoleFilter from "../components/ConsoleFilter.jsx";
import { getAuthenticatedAppForUser } from "../lib/firebase/serverApp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Therapy Compass",
  description: "Find clinicians, read verified patient reviews.",
};

export default async function RootLayout({ children }) {
  let currentUser = null;
  try {
    const result = await getAuthenticatedAppForUser();
    currentUser = result.currentUser;
  } catch (error) {
    console.error("Error initializing Firebase in layout:", error);
    // Continue without user - app will still work, just without auth
  }
  
  return (
    <html lang="en">
      <body className="bg-[#F1EAD8] text-[#68604D]">
        <ConsoleFilter />
        <Header initialUser={currentUser?.toJSON()} />
        <main>{children}</main>
      </body>
    </html>
  );
}
// layout implemented directly in this file for JSX usage 
// since Header needs a hook and can't be a server component
