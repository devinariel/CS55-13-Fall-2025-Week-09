// The filters shown on the clinician listings page

import Tag from "@/src/components/Tag.jsx";
import { randomData } from "../lib/randomData.js";

function FilterSelect({ label, options, value, onChange, name, icon }) {
  return (
    <div>
      <img src={icon} alt={label} />
      <label>
        {label}
        <select value={value} onChange={onChange} name={name} className="bg-white border rounded px-2 py-1 ml-2">
          {options.map((option, index) => (
            <option value={option} key={index}>
              {option === "" ? "All" : option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function Filters({ filters, setFilters }) {
  const handleSelectionChange = (event, name) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: event.target.value,
    }));
  };

  const updateField = (type, value) => {
    setFilters({ ...filters, [type]: value });
  };

  return (
    <section className="filter bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200" style={{ marginLeft: '25px', marginBottom: '1.5rem' }}>
      <details className="filter-menu">
        <summary className="cursor-pointer">
          <img src="/filter.svg" alt="filter" className="w-6 h-6" />
          <div className="ml-3">
            <p className="font-semibold text-[#68604D] text-lg">Clinicians</p>
            <p className="text-sm text-[#8A8E75] font-medium">Sorted by {filters.sort || "Rating"}</p>
          </div>
        </summary>

        <form
          method="GET"
          onSubmit={(event) => {
            event.preventDefault();
            event.target.parentNode.removeAttribute("open");
          }}
        >
          <FilterSelect
            label="Specialization"
            options={["", ...randomData.clinicianSpecialties]}
            value={filters.specialization}
            onChange={(event) => handleSelectionChange(event, "specialization")}
            name="specialization"
            icon="/specialty.svg"
          />

          <FilterSelect
            label="Modality"
            options={["", ...randomData.clinicianModalities]}
            value={filters.modality}
            onChange={(event) => handleSelectionChange(event, "modality")}
            name="modality"
            icon="/specialty.svg"
          />

          <FilterSelect
            label="City"
            options={["", ...randomData.clinicianCities]}
            value={filters.city}
            onChange={(event) => handleSelectionChange(event, "city")}
            name="city"
            icon="/location.svg"
          />

          <FilterSelect
            label="Sort"
            options={["Rating", "Reviews"]}
            value={filters.sort}
            onChange={(event) => handleSelectionChange(event, "sort")}
            name="sort"
            icon="/sortBy.svg"
          />

          <footer className="mt-6 pt-4 border-t border-[#D5C7AD]">
            <menu className="flex justify-end gap-3">
              <button
                className="button--cancel text-sm text-[#8A8E75] px-5 py-2 rounded-lg hover:bg-[#F1EAD8] transition-colors duration-200"
                type="reset"
                onClick={() => {
                  setFilters({
                    city: "",
                    specialization: "",
                    modality: "",
                    sort: "Rating",
                  });
                }}
              >
                Reset
              </button>
              <button 
                type="submit" 
                className="button--confirm px-5 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
              >
                Apply Filters
              </button>
            </menu>
          </footer>
        </form>
      </details>

      <div className="tags mt-4">
        {Object.entries(filters).map(([type, value]) => { 
          // The main filter bar already specifies what
          // sorting is being used. So skip showing the
          // sorting as a 'tag'
          if (type == "sort" || value == "") {
            return null;
          }
          return (
            <Tag
              key={value}
              type={type}
              value={value}
              updateField={updateField}
            />
          );
        })}
      </div>
    </section>
  );
}
