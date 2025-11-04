import ClinicianListings from "../components/ClinicianListings";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="main__home p-4 md:p-8">
      <h1 className="text-3xl font-bold text-[#68604D] mb-6">The Therapy Compass</h1>
      <ClinicianListings />
    </main>
  );
}