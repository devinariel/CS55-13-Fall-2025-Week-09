import ClinicianListings from "../components/ClinicianListings";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="p-4 md:p-8">
      <ClinicianListings />
    </main>
  );
}