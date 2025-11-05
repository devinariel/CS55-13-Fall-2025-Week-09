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
    <main className="main__home p-4 md:p-8">
      <ClinicianList initialClinicians={clinicians} />
    </main>
  );
}
