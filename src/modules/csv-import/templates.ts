export type ColumnMapping = Record<string, string>; // csvHeader -> internalField

export const productTemplate: ColumnMapping = {
  "SKU": "sku",           // required
  "Title": "title",       // required
  "Description": "description",
  "Price": "price",       // in major currency units e.g. 12.50
  "Compare At Price": "compareAtPrice",
  "Cost": "cost",
  "Barcode": "barcode",
  "EAN": "ean",
  "Weight (g)": "weight",
  "Vendor": "vendor",
  "Tags": "tags",         // comma-separated
  "Status": "status",     // active|draft|archived
  "Variant Title": "variantTitle",
  "Option1 Name": "option1Name",
  "Option1 Value": "option1Value",
  "Option2 Name": "option2Name",
  "Option2 Value": "option2Value",
  "Inventory Qty": "inventoryQty",
};

export const customerTemplate: ColumnMapping = {
  "Email": "email",       // required
  "First Name": "firstName",
  "Last Name": "lastName",
  "Phone": "phone",
  "Company": "company",
  "Address Line 1": "address1",
  "Address Line 2": "address2",
  "City": "city",
  "Zip": "zip",
  "Country": "country",   // ISO 2-letter
  "Tags": "tags",
  "Notes": "notes",
};

export const orderTemplate: ColumnMapping = {
  "Order Number": "orderNumber",  // required
  "Email": "email",
  "First Name": "firstName",
  "Last Name": "lastName",
  "SKU": "sku",           // required (at least one line item)
  "Quantity": "quantity", // required, must be >= 1
  "Unit Price": "unitPrice",
  "Total": "total",
  "Currency": "currency",
  "Status": "status",
  "Payment Status": "paymentStatus",
  "Shipping Address": "shippingAddress",
  "Notes": "notes",
  "Tags": "tags",
};
