import { getAuthenticatedAppForUser } from "../lib/firebase/serverApp";
import { getFirestore } from "firebase/firestore";
import { getClinicians } from "../lib/firebase/therapyFirestore";
import ClinicianList from "../components/ClinicianList.jsx";

export const dynamic = "force-dynamic";

export default async function Home(props) {
  const searchParams = props?.searchParams || {};
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  const clinicians = await getClinicians(getFirestore(firebaseServerApp), searchParams);

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-[#161d23] mb-4">The Therapy Compass</h1>
      <ClinicianList initialClinicians={clinicians} />
    </main>
  );
}
