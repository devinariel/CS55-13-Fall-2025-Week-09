import ClinicianListings from "../components/ClinicianListings";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="main__home p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <ClinicianListings />
      </div>
    </main>
  );
}