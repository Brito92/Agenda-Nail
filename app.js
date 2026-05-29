const DESIGN = {
  width: 225.33333333333334,
  height: 300,
  scale: 6,
  cards: [
    { x: 42.8, y: 100.9, w: 48.5, h: 84.2 },
    { x: 102, y: 100.8, w: 48.5, h: 84.2 },
    { x: 160.7, y: 100.8, w: 48.5, h: 84.2 },
    { x: 42.8, y: 190.1, w: 48.5, h: 84.2 },
    { x: 102, y: 189.1, w: 48.5, h: 84.2 },
    { x: 160.7, y: 189.1, w: 48.5, h: 84.2 }
  ],
  rowYs5: [30.8, 47.9, 63.9, 77.1, 87.1],
  rowYs4: [30.8, 47.9, 64.9, 82.1]

};

function getRowYs(times) {
  const hasFifthTime = Boolean(times[4]?.trim());
  return hasFifthTime ? DESIGN.rowYs5 : DESIGN.rowYs4;
}

const defaultState = {
  fileName: "agenda-da-semana",
  days: [
    { name: "Segunda", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
    { name: "Terça", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
    { name: "Quarta", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
    { name: "Quinta", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
    { name: "Sexta", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
    { name: "Sábado", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] },
    { name: "Domingo", active: true, times: ["08:00", "09:00", "10:00", "14:00", "15:00"] }
  ]
};

const state = loadState();
const form = document.querySelector("#scheduleForm");
const overlay = document.querySelector("#overlay");
const fileNameInput = document.querySelector("#fileName");
const dayChips = [...document.querySelectorAll(".day-chip")];

fileNameInput.value = state.fileName;
renderControls();
renderPreview();

fileNameInput.addEventListener("input", () => {
  state.fileName = fileNameInput.value.trim() || defaultState.fileName;
  saveState();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  state.days.forEach((day) => {
    day.active = true;
    day.times = ["", "", "", "", ""];
  });
  renderControls();
  renderPreview();
  saveState();
});

document.querySelector("#jpgBtn").addEventListener("click", async () => {
  const canvas = await renderCanvas("jpeg");
  downloadBlob(await canvasToBlob(canvas, "image/jpeg", 0.96), `${safeName()}.jpg`);
});

document.querySelector("#pdfBtn").addEventListener("click", async () => {
  const canvas = await renderCanvas("jpeg");
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.96);
  const pdf = makePdfWithJpeg(jpegDataUrl, DESIGN.width, DESIGN.height);
  downloadBlob(pdf, `${safeName()}.pdf`);
});

dayChips.forEach((chip, index) => {
  chip.addEventListener("click", () => {
    state.days[index].active = !state.days[index].active;
    renderControls();
    renderPreview();
    saveState();
  });
});

function renderControls() {
  form.innerHTML = "";

  state.days.forEach((day, dayIndex) => {
    dayChips[dayIndex].classList.toggle("active", day.active);
    dayChips[dayIndex].setAttribute("aria-pressed", String(day.active));

    const card = document.createElement("section");
    card.className = "day-card";

    const top = document.createElement("div");
    top.className = "day-editor";

    const title = document.createElement("strong");
    title.className = "day-title";
    title.textContent = day.name;

    const toggle = document.createElement("label");
    toggle.className = "toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = day.active;
    checkbox.addEventListener("change", () => {
      day.active = checkbox.checked;
      renderControls();
      renderPreview();
      saveState();
    });
    toggle.append(checkbox, "Disponível");
    top.append(title, toggle);

    const grid = document.createElement("div");
    grid.className = "times-grid";
    for (let i = 0; i < 5; i += 1) {
      const input = document.createElement("input");
      input.className = "time-input";
      input.type = "text";
      input.inputMode = "numeric";
      input.placeholder = `${String(8 + i).padStart(2, "0")}:00`;
      input.value = day.times[i] || "";
      input.setAttribute("aria-label", `${day.name}, horário ${i + 1}`);
      input.addEventListener("input", () => {
        day.times[i] = input.value;
        renderPreview();
        saveState();
      });
      grid.append(input);
    }

    card.append(top, grid);
    form.append(card);
  });
}

function renderPreview() {
  overlay.innerHTML = "";

  state.days.filter((day) => day.active).slice(0, 6).forEach((day, index) => {
    const cardDef = DESIGN.cards[index];
    const card = document.createElement("div");
    card.className = "slot-card";
    card.style.left = pct(cardDef.x, DESIGN.width);
    card.style.top = pct(cardDef.y, DESIGN.height);
    card.style.width = pct(cardDef.w, DESIGN.width);
    card.style.height = pct(cardDef.h, DESIGN.height);

    if (day.active) {
      const title = document.createElement("div");
      title.className = "slot-day";
      title.textContent = compactDayName(day.name);
      card.append(title);
    }

    const rowYs = getRowYs(day.times);

    day.times.forEach((time, timeIndex) => {
      if (!time.trim()) return;
      const row = document.createElement("div");
      row.className = "slot-time";
      row.style.top = `${rowYs[timeIndex]}%`;
      row.textContent = time.trim();
      card.append(row);
    });

    overlay.append(card);
  });
}

async function renderCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(DESIGN.width * DESIGN.scale);
  canvas.height = Math.round(DESIGN.height * DESIGN.scale);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const bg = await loadImage("assets/template.svg");
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  state.days.filter((day) => day.active).slice(0, 6).forEach((day, index) => {
    const card = scaleCard(DESIGN.cards[index]);

    ctx.save();
    ctx.fillStyle = "#fff7df";
    ctx.shadowColor = "rgba(80, 48, 6, 0.35)";
    ctx.shadowBlur = 1 * DESIGN.scale;
    ctx.shadowOffsetY = 0.75 * DESIGN.scale;
    ctx.font = `700 ${10 * DESIGN.scale}px Georgia`;
    ctx.fillText(compactDayName(day.name).toUpperCase(), card.x + card.w / 2 - 12, card.y + card.h * 0.116);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#7d5a25";
    ctx.textAlign = "left";
    ctx.font = `700 ${9 * DESIGN.scale}px Times New Roman`;

    const rowYs = getRowYs(day.times);

    day.times.forEach((time, timeIndex) => {
      const clean = time.trim();
      if (!clean) return;
      const x = card.x + card.w * 0.26;
      const y = card.y + card.h * (rowYs[timeIndex] / 100 + 0.055);
      ctx.fillText(clean, x, y);
    });
    ctx.restore();
  });

  return canvas;
}

function makePdfWithJpeg(jpegDataUrl, pageW, pageH) {
  const jpg = atob(jpegDataUrl.split(",")[1]);
  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /XObject /Subtype /Image /Width ${Math.round(DESIGN.width * DESIGN.scale)} /Height ${Math.round(DESIGN.height * DESIGN.scale)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n${jpg}\nendstream`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return new Blob([bytes], { type: "application/pdf" });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("nail-agenda-state"));
    if (saved?.days?.length === 7) return saved;
  } catch {
    return structuredClone(defaultState);
  }
  return structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem("nail-agenda-state", JSON.stringify(state));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

function safeName() {
  return (state.fileName || defaultState.fileName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || defaultState.fileName;
}

function pct(value, base) {
  return `${(value / base) * 100}%`;
}

function scaleCard(card) {
  return {
    x: card.x * DESIGN.scale,
    y: card.y * DESIGN.scale,
    w: card.w * DESIGN.scale,
    h: card.h * DESIGN.scale
  };
}

function compactDayName(name) {
  const map = {
    "Segunda": "Seg",
    "Terça": "Ter",
    "Quarta": "Qua",
    "Quinta": "Qui",
    "Sexta": "Sex",
    "Sábado": "Sáb",
    "Domingo": "Dom"
  };
  return map[name] || name.slice(0, 3);
}
