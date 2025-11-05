import ClinicianListings from "../components/ClinicianListings";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="main__home p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-[#68604D] mb-6 md:mb-8 text-center md:text-left">The Therapy Compass</h1>
        <ClinicianListings />
      </div>
    </main>
  );
}