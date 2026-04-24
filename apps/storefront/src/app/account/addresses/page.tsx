"use client";
import { useState } from "react";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  zip: string;
  country: string;
  isDefault?: boolean;
}

export default function AccountAddressesPage() {
  const [addresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Addresses</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {showForm ? "Cancel" : "Add address"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New address</h2>
          <form className="grid grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
            {[
              { name: "firstName", label: "First name" },
              { name: "lastName", label: "Last name" },
              { name: "address1", label: "Address", colSpan: true },
              { name: "city", label: "City" },
              { name: "zip", label: "Zip" },
              { name: "country", label: "Country" },
            ].map(({ name, label, colSpan }) => (
              <div key={name} className={colSpan ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  name={name}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Save address
              </button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 && !showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">No saved addresses yet.</p>
          <p className="text-sm text-gray-400 mt-1">Add an address to speed up checkout.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {addr.isDefault && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 mb-2">
                Default
              </span>
            )}
            <address className="text-sm text-gray-700 not-italic space-y-0.5">
              <p>{addr.firstName} {addr.lastName}</p>
              <p>{addr.address1}</p>
              <p>{addr.zip} {addr.city}</p>
              <p>{addr.country}</p>
            </address>
          </div>
        ))}
      </div>
    </div>
  );
}
