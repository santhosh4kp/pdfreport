async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const lineHeight = 7;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Validate required fields
  const requiredFields = [
    "logoFile", "title", "date", "organizer", 
    "resourcePerson", "attendanceCount"
  ];

  for (const field of requiredFields) {
    const input = document.getElementById(field);
    if (!input || (!input.value && !input.files?.length)) {
      const fieldLabel = input?.labels ? input.labels[0].innerText : field;
      alert(`Please fill out the ${fieldLabel} field.`);
      return;
    }
  }

  // Add Logo
  const logoInput = document.getElementById("logoFile");
  if (logoInput && logoInput.files.length > 0) {
    try {
      const logoImage = await loadImageFileAsBase64(logoInput.files[0]);
      pdf.addImage(logoImage, "PNG", margin, y, 20, 10);
      y += 20;
    } catch (error) {
      alert("Error loading logo: " + error.message);
      return;
    }
  }

  // Add Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(document.getElementById("title").value, pageWidth / 2, y, { align: "center" });
  y += 15;

  // Add Event Details with Overflow Handling
  const fields = [
    { label: "Date", value: document.getElementById("date").value },
    { label: "Focus", value: document.getElementById("focus").value },
    { label: "Organizer", value: document.getElementById("organizer").value },
    { label: "Resource Person/Guest", value: document.getElementById("resourcePerson").value },
    { label: "Profile", value: document.getElementById("profile").value },
    { label: "Total Attendance", value: document.getElementById("attendanceCount").value },
    { label: "Outcomes", value: document.getElementById("outcomes").value },
    { label: "Venue", value: document.getElementById("venue").value },
    { label: "Description", value: document.getElementById("description").value },
  ];

  fields.forEach(({ label, value }) => {
    pdf.setFont("helvetica", "bold");
    const wrappedLabel = pdf.splitTextToSize(`${label}:`, contentWidth / 3);
    pdf.text(wrappedLabel, margin, y);
    const labelHeight = wrappedLabel.length * lineHeight;

    pdf.setFont("helvetica", "normal");
    const wrappedValue = pdf.splitTextToSize(value, (2 * contentWidth) / 3);
    pdf.text(wrappedValue, margin + contentWidth / 3 + 2, y);
    const valueHeight = wrappedValue.length * lineHeight;

    y += Math.max(labelHeight, valueHeight) + 2;

    // Check for page overflow
    if (y > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  });

  // Add Uploaded Images on a New Page
  const images = document.getElementById("images").files;
  if (images.length > 0) {
    if (images.length > 6) {
      alert("You can upload a maximum of 6 images.");
      return;
    }
    pdf.addPage();
    let imageX = margin;
    let imageY = margin;

    for (let i = 0; i < images.length; i++) {
      try {
        const imgData = await loadImageFileAsBase64(images[i]);
        pdf.addImage(imgData, "JPEG", imageX, imageY, 90, 60);

        if (i % 2 === 1) {
          imageX = margin;
          imageY += 65;
        } else {
          imageX = pageWidth / 2 + 5;
        }
      } catch (error) {
        alert("Error loading image: " + error.message);
        return;
      }
    }
  }

  // Add Brochure on a Separate Page
  const brochureInput = document.getElementById("brochure");
  if (brochureInput && brochureInput.files[0]) {
    pdf.addPage();
    await addPDFPagesToPDF(brochureInput.files[0], pdf, margin);
  }

  // Add Attendance File on a Separate Page
  const attendanceInput = document.getElementById("attendanceFile");
  if (attendanceInput && attendanceInput.files[0]) {
    pdf.addPage();
    await addPDFPagesToPDF(attendanceInput.files[0], pdf, margin);
  }

  // Save the PDF
  pdf.save(`${document.getElementById("title").value}_Report.pdf`);
}

// Helper Functions
async function loadImageFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addPDFPagesToPDF(file, pdf, margin) {
  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";

  const pdfFile = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  const numPages = pdfFile.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfFile.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;
    const imgData = canvas.toDataURL("image/png");

    if (i > 1) pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, margin, pdf.internal.pageSize.getWidth() - 2 * margin, viewport.height * 0.264583);
  }
}
