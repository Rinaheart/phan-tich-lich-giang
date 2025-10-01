(() => {
  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
  const sessionNames = [
    { key: "morning", label: "Sáng" },
    { key: "afternoon", label: "Chiều" },
    { key: "evening", label: "Tối" }
  ];

  const state = {
    schedule: null,
    currentWeekIndex: 0,
    selectedDate: null,
    searchTerm: "",
    filters: {
      teacher: "",
      course: "",
      code: "",
      room: "",
      session: ""
    },
    colorize: false,
    detectClash: false,
    theme: localStorage.getItem("tta-theme") || "light",
    colorMap: JSON.parse(localStorage.getItem("tta-color-map") || "{}")
  };

  const els = {
    fileInput: document.getElementById("fileInput"),
    uploadBtn: document.getElementById("uploadBtn"),
    resetBtn: document.getElementById("resetBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    printBtn: document.getElementById("printBtn"),
    themeToggle: document.getElementById("themeToggle"),
    alertBar: document.getElementById("alertBar"),
    alertText: document.querySelector("#alertBar .alert-text"),
    dismissAlert: document.getElementById("dismissAlert"),
    jumpToCurrentWeek: document.getElementById("jumpToCurrentWeek"),
    weekSelect: document.getElementById("weekSelect"),
    datePicker: document.getElementById("datePicker"),
    searchInput: document.getElementById("searchInput"),
    teacherFilter: document.getElementById("teacherFilter"),
    courseFilter: document.getElementById("courseFilter"),
    codeFilter: document.getElementById("codeFilter"),
    roomFilter: document.getElementById("roomFilter"),
    sessionFilter: document.getElementById("sessionFilter"),
    colorToggle: document.getElementById("colorToggle"),
    clashToggle: document.getElementById("clashToggle"),
    tabs: document.querySelectorAll(".tab"),
    viewWeek: document.getElementById("viewWeek"),
    viewDay: document.getElementById("viewDay"),
    viewSemester: document.getElementById("viewSemester"),
    detailPanel: document.getElementById("detailPanel"),
    closeDetail: document.getElementById("closeDetail"),
    detailTitle: document.getElementById("detailTitle"),
    detailCode: document.getElementById("detailCode"),
    detailGroup: document.getElementById("detailGroup"),
    detailPeriods: document.getElementById("detailPeriods"),
    detailRoom: document.getElementById("detailRoom"),
    detailTeacher: document.getElementById("detailTeacher"),
    detailLink: document.getElementById("detailLink"),
    copyDetail: document.getElementById("copyDetail"),
    toastContainer: document.getElementById("toastContainer"),
    dropOverlay: document.getElementById("dropOverlay"),
    cardTemplate: document.getElementById("cardTemplate")
  };

  function init() {
    applyTheme(state.theme);
    els.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";

    els.uploadBtn.addEventListener("click", () => els.fileInput.click());
    els.fileInput.addEventListener("change", handleFileInput);
    ;["dragenter", "dragover"].forEach(evt => document.addEventListener(evt, handleDragEnter));
    ;["dragleave", "drop"].forEach(evt => document.addEventListener(evt, handleDragLeave));
    document.addEventListener("drop", handleDrop);

    els.resetBtn.addEventListener("click", resetApp);
    els.exportJsonBtn.addEventListener("click", exportJSON);
    els.exportCsvBtn.addEventListener("click", exportCSV);
    els.printBtn.addEventListener("click", () => window.print());
    els.themeToggle.addEventListener("click", toggleTheme);
    els.dismissAlert.addEventListener("click", () => hideAlert());
    els.jumpToCurrentWeek.addEventListener("click", () => {
      selectWeekContaining(new Date());
      focusSearch();
    });

    els.weekSelect.addEventListener("change", () => {
      state.currentWeekIndex = Number(els.weekSelect.value);
      const week = state.schedule?.weeks[state.currentWeekIndex];
      if (week) {
        state.selectedDate = week.from;
        els.datePicker.value = formatInputDate(week.from);
      }
      renderAll();
    });

    els.datePicker.addEventListener("change", () => {
      const date = els.datePicker.value ? new Date(els.datePicker.value) : null;
      if (date) {
        state.selectedDate = date;
        const weekIndex = findWeekIndexByDate(date);
        if (weekIndex !== -1 && weekIndex !== state.currentWeekIndex) {
          state.currentWeekIndex = weekIndex;
          els.weekSelect.value = String(weekIndex);
        }
      }
      renderAll();
    });

    els.searchInput.addEventListener("input", () => {
      state.searchTerm = els.searchInput.value.trim().toLowerCase();
      renderAll();
    });

    els.teacherFilter.addEventListener("change", () => {
      state.filters.teacher = els.teacherFilter.value;
      renderAll();
    });
    els.courseFilter.addEventListener("change", () => {
      state.filters.course = els.courseFilter.value;
      renderAll();
    });
    els.codeFilter.addEventListener("change", () => {
      state.filters.code = els.codeFilter.value;
      renderAll();
    });
    els.roomFilter.addEventListener("change", () => {
      state.filters.room = els.roomFilter.value;
      renderAll();
    });
    els.sessionFilter.addEventListener("change", () => {
      state.filters.session = els.sessionFilter.value;
      renderAll();
    });

    els.colorToggle.addEventListener("change", () => {
      state.colorize = els.colorToggle.checked;
      localStorage.setItem("tta-colorize", state.colorize ? "1" : "0");
      renderAll();
    });

    els.clashToggle.addEventListener("change", () => {
      state.detectClash = els.clashToggle.checked;
      renderAll();
    });

    els.tabs.forEach(tab => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    els.closeDetail.addEventListener("click", closeDetailPanel);
    els.copyDetail.addEventListener("click", copyDetailInfo);
    document.addEventListener("keydown", evt => {
      if (evt.key === "Escape") {
        closeDetailPanel();
        hideAlert();
      }
    });

    state.colorize = localStorage.getItem("tta-colorize") === "1";
    els.colorToggle.checked = state.colorize;
  }

  function handleFileInput(evt) {
    const file = evt.target.files?.[0];
    if (!file) return;
    readFile(file);
    evt.target.value = "";
  }

  function handleDragEnter(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    els.dropOverlay.classList.remove("hidden");
  }

  function handleDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (evt.type === "dragleave" && evt.target !== document) return;
    els.dropOverlay.classList.add("hidden");
  }

  function handleDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    els.dropOverlay.classList.add("hidden");
    const file = evt.dataTransfer?.files?.[0];
    if (file) readFile(file);
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseSchedule(reader.result);
        state.schedule = parsed;
        state.currentWeekIndex = findWeekIndexByDate(new Date());
        if (state.currentWeekIndex === -1) {
          state.currentWeekIndex = 0;
        }
        state.selectedDate = state.schedule.weeks[state.currentWeekIndex]?.from || null;
        updateControlsAvailability(true);
        populateWeekSelect();
        populateFilters();
        updateAlertBar();
        renderAll();
        focusSearch();
        showToast(`Đã nạp dữ liệu lịch giảng.`);
        const meta = state.schedule.meta;
        if (meta.semesterRoman || meta.schoolYear) {
          const infoParts = [
            meta.semesterRoman ? `Học kỳ ${meta.semesterRoman}` : "",
            meta.schoolYear ? `Năm học ${meta.schoolYear}` : "",
            meta.teacher ? `GV ${meta.teacher}` : "",
            meta.updateDate ? `Tuần cập nhật: ${formatDate(meta.updateDate)}` : ""
          ].filter(Boolean);
          if (infoParts.length) {
            showToast(`Đã nạp dữ liệu lịch giảng. ${infoParts.join(" • ")}`);
          }
        }
      } catch (error) {
        console.error(error);
        showToast("Không thể phân tích file. Kiểm tra lại cấu trúc HTML.");
      }
    };
    reader.onerror = () => {
      showToast("Không thể đọc file.");
    };
    reader.readAsText(file, "utf-8");
  }

  function parseSchedule(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const table = findMainTable(doc);
    if (!table) throw new Error("Không tìm thấy bảng lịch");
    const rows = Array.from(table.querySelectorAll("tr"));

    const weeks = [];
    let foundUpdateDates = [];

    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll("td"));
      if (cells.length === 1 && cells[0].colSpan === 7 && /Từ ngày/i.test(cells[0].textContent)) {
        const text = cells[0].textContent.replace(/\s+/g, " ").trim();
        const match = text.match(/Từ ngày:?\s*(\d{2}\/\d{2}\/\d{4}).*đến ngày:?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (!match) continue;
        const from = parseDMY(match[1]);
        const to = parseDMY(match[2]);
        const week = {
          from,
          to,
          updateDate: null,
          days: Array.from({ length: 7 }, () => ({
            morning: [],
            afternoon: [],
            evening: []
          }))
        };

        for (let s = 0; s < sessionNames.length; s++) {
          const row = rows[i + 1 + s];
          if (!row) continue;
          const dayCells = Array.from(row.querySelectorAll("td"));
          for (let d = 0; d < 7; d++) {
            const cell = dayCells[d];
            if (!cell) continue;
            const dayDate = addDays(from, d);
            const entries = parseCell(cell, dayDate);
            entries.forEach(entry => {
              week.days[d][sessionNames[s].key].push(entry);
            });
            if (cell.classList.contains("hitec-td-tkbTuanHienTai")) {
              const updateDate = addDays(from, d);
              week.updateDate = updateDate;
              foundUpdateDates.push(updateDate);
            }
          }
        }
        weeks.push(week);
        i += sessionNames.length;
      }
    }

    if (!weeks.length) throw new Error("Không có tuần hợp lệ");

    const meta = extractMeta(doc);
    if (foundUpdateDates.length) {
      meta.updateDate = foundUpdateDates.reduce((latest, date) => date > latest ? date : latest, foundUpdateDates[0]);
    } else {
      const latestTo = weeks.reduce((latest, week) => week.to > latest ? week.to : latest, weeks[0].to);
      meta.updateDate = latestTo;
    }

    weeks.forEach(week => {
      if (!week.updateDate) week.updateDate = null;
    });

    return { meta, weeks };
  }

  function findMainTable(doc) {
    const tables = Array.from(doc.querySelectorAll("table"));
    return tables.find(tbl => /Từ ngày/i.test(tbl.textContent || "")) || tables[0] || null;
  }

  function parseCell(cell, dayDate) {
    const anchors = Array.from(cell.querySelectorAll("p > a, a"));
    const entries = [];
    anchors.forEach(anchor => {
      const courseCode = anchor.querySelector("strong")?.textContent?.trim() || "";
      const title = anchor.getAttribute("title")?.trim() || anchor.textContent.trim();
      const { courseName, group } = parseTitle(title);
      const detail = parseDetail(anchor);
      const href = anchor.getAttribute("href") || "";
      const entry = {
        courseCode,
        courseName,
        group,
        periods: detail.periods,
        room: detail.room,
        teacher: detail.teacher,
        href,
        date: dayDate,
        periodRange: detail.periodRange
      };
      entries.push(entry);
    });
    return entries;
  }

  function parseTitle(title) {
    const parts = title.split(" - ").map(str => str.trim()).filter(Boolean);
    const courseName = parts.shift() || title;
    const group = parts.join(" - ");
    return { courseName, group };
  }

  function parseDetail(anchor) {
    const detailHtml = anchor.dataset?.content || "";
    let text = "";
    if (detailHtml) {
      const temp = document.createElement("div");
      temp.innerHTML = detailHtml;
      text = temp.textContent || "";
    } else {
      const html = anchor.innerHTML;
      if (html.includes("<br")) {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        text = temp.textContent || "";
      } else {
        text = anchor.textContent;
      }
    }
    const clean = text.replace(/\s+/g, " ").trim();
    const periodsMatch = clean.match(/Tiết:?\s*([^|]+)/i);
    const roomMatch = clean.match(/Phòng:?\s*([^|]+)/i);
    const teacherMatch = clean.match(/GV:?\s*([^|]+)/i);
    const periods = periodsMatch ? periodsMatch[1].trim() : "";
    const room = roomMatch ? roomMatch[1].trim() : "";
    const teacher = teacherMatch ? teacherMatch[1].trim() : "";
    return {
      periods,
      room,
      teacher,
      periodRange: extractPeriodRange(periods)
    };
  }

  function extractPeriodRange(periods) {
    if (!periods) return null;
    const numbers = Array.from(periods.matchAll(/\d+/g)).map(m => Number(m[0]));
    if (!numbers.length) return null;
    const start = numbers[0];
    const end = numbers.length >= 2 ? numbers[1] : numbers[0];
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return { start, end: Math.max(start, end) };
  }

  function extractMeta(doc) {
    const meta = {
      schoolYear: "",
      semester: null,
      semesterRoman: "",
      teacher: "",
      updateDate: null
    };
    const hrefs = Array.from(doc.querySelectorAll("a[href]"), a => a.getAttribute("href"));
    for (const href of hrefs) {
      if (!href) continue;
      const match = href.match(/(\d{4})-(\d{4})\.S(\d)/i);
      if (match) {
        meta.schoolYear = `${match[1]}-${match[2]}`;
        meta.semester = Number(match[3]);
        meta.semesterRoman = meta.semester === 2 ? "II" : "I";
        break;
      }
    }
    const teacherElement = doc.querySelector(".teacher-name, .giangvien, #teacherName");
    if (teacherElement) {
      meta.teacher = teacherElement.textContent.trim();
    }
    return meta;
  }

  function populateWeekSelect() {
    const weeks = state.schedule.weeks;
    els.weekSelect.innerHTML = "";
    weeks.forEach((week, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${formatDate(week.from)} → ${formatDate(week.to)}`;
      els.weekSelect.appendChild(option);
    });
    els.weekSelect.disabled = false;
    if (state.currentWeekIndex >= 0 && state.currentWeekIndex < weeks.length) {
      els.weekSelect.value = String(state.currentWeekIndex);
      const week = weeks[state.currentWeekIndex];
      state.selectedDate = state.selectedDate || week.from;
      els.datePicker.value = formatInputDate(state.selectedDate);
    }
    els.datePicker.disabled = false;
  }

  function populateFilters() {
    const options = {
      teacher: new Set(),
      course: new Set(),
      code: new Set(),
      room: new Set()
    };
    state.schedule.weeks.forEach(week => {
      week.days.forEach(day => {
        sessionNames.forEach(({ key }) => {
          day[key].forEach(entry => {
            if (entry.teacher) options.teacher.add(entry.teacher);
            if (entry.courseName) options.course.add(entry.courseName);
            if (entry.courseCode) options.code.add(entry.courseCode);
            if (entry.room) options.room.add(entry.room);
          });
        });
      });
    });
    fillSelect(els.teacherFilter, options.teacher);
    fillSelect(els.courseFilter, options.course);
    fillSelect(els.codeFilter, options.code);
    fillSelect(els.roomFilter, options.room);
    [els.teacherFilter, els.courseFilter, els.codeFilter, els.roomFilter, els.sessionFilter].forEach(sel => {
      sel.disabled = false;
    });
    els.searchInput.disabled = false;
    els.colorToggle.disabled = false;
    els.clashToggle.disabled = false;
    els.exportJsonBtn.disabled = false;
    els.exportCsvBtn.disabled = false;
    els.printBtn.disabled = false;
  }

  function fillSelect(select, valuesSet) {
    const currentValue = select.value;
    select.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Tất cả";
    select.appendChild(defaultOption);
    Array.from(valuesSet).sort((a, b) => a.localeCompare(b)).forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = currentValue || "";
  }

  function renderAll() {
    renderWeekView();
    renderDayView();
    renderSemesterView();
  }

  function renderWeekView() {
    els.viewWeek.innerHTML = "";
    if (!state.schedule) {
      els.viewWeek.innerHTML = `<p>Hãy tải lên file HTML lịch giảng để bắt đầu.</p>`;
      return;
    }
    const week = state.schedule.weeks[state.currentWeekIndex];
    if (!week) return;

    const title = document.createElement("h2");
    title.textContent = `Tuần ${formatDate(week.from)} – ${formatDate(week.to)}`;
    if (weekContainsDate(week, state.schedule.meta.updateDate)) {
      title.classList.add("current-week-title");
    }
    els.viewWeek.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "week-grid";

    const blankHeader = document.createElement("header");
    blankHeader.textContent = "";
    grid.appendChild(blankHeader);

    dayNames.forEach((name, idx) => {
      const header = document.createElement("header");
      header.className = "day-header";
      const date = addDays(week.from, idx);
      header.innerHTML = `<div>${name}</div><small>${formatDate(date)}</small>`;
      grid.appendChild(header);
    });

    sessionNames.forEach(session => {
      const label = document.createElement("div");
      label.className = "session-label";
      label.textContent = session.label;
      grid.appendChild(label);

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        const entries = week.days[dayIndex][session.key];
        const filteredEntries = entries.filter(entry => filterEntry(entry, session.key));
        let clashes = new Set();
        let clashMap = new Map();
        if (state.detectClash) {
          const { clashSet, clashGroup } = detectClashes(filteredEntries);
          clashes = clashSet;
          clashMap = clashGroup;
        }
        filteredEntries.forEach(entry => {
          const card = createCard(entry, {
            weekIndex: state.currentWeekIndex,
            dayIndex,
            session: session.key,
            clashes,
            clashMap
          });
          cell.appendChild(card);
        });
        grid.appendChild(cell);
      }
    });

    els.viewWeek.appendChild(grid);
  }

  function renderDayView() {
    els.viewDay.innerHTML = "";
    if (!state.schedule) {
      els.viewDay.innerHTML = `<p>Chưa có dữ liệu.</p>`;
      return;
    }
    const date = state.selectedDate || new Date();
    const weekIndex = findWeekIndexByDate(date);
    const week = state.schedule.weeks[weekIndex >= 0 ? weekIndex : 0];
    if (!week) return;
    const dayIndex = Math.max(0, Math.min(6, (date.getDay() + 6) % 7));
    const dayDate = addDays(week.from, dayIndex);
    const title = document.createElement("h2");
    title.textContent = `Ngày ${formatDate(dayDate)}`;
    els.viewDay.appendChild(title);

    const wrapper = document.createElement("div");
    wrapper.className = "day-view";

    sessionNames.forEach(session => {
      const section = document.createElement("section");
      section.className = "day-session";
      const heading = document.createElement("h3");
      heading.textContent = session.label;
      section.appendChild(heading);
      const entries = week.days[dayIndex][session.key].filter(entry => filterEntry(entry, session.key));
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.textContent = "Không có lớp.";
        section.appendChild(empty);
      } else {
        entries.forEach(entry => {
          const card = createCard(entry, {
            weekIndex,
            dayIndex,
            session: session.key,
            clashes: new Set(),
            clashMap: new Map()
          });
          section.appendChild(card);
        });
      }
      wrapper.appendChild(section);
    });

    els.viewDay.appendChild(wrapper);
  }

  function renderSemesterView() {
    els.viewSemester.innerHTML = "";
    if (!state.schedule) {
      els.viewSemester.innerHTML = `<p>Chưa có dữ liệu.</p>`;
      return;
    }
    const container = document.createElement("div");
    container.className = "semester-accordion";

    state.schedule.weeks.forEach((week, index) => {
      const details = document.createElement("details");
      details.className = "week-accordion";
      if (index === state.currentWeekIndex) details.open = true;
      const summary = document.createElement("summary");
      summary.textContent = `Tuần ${index + 1}: ${formatDate(week.from)} – ${formatDate(week.to)}`;
      details.appendChild(summary);
      const miniGrid = document.createElement("div");
      miniGrid.className = "mini-grid";
      dayNames.forEach((name, dayIndex) => {
        const cell = document.createElement("div");
        const date = addDays(week.from, dayIndex);
        const total = sessionNames.reduce((acc, session) => acc + week.days[dayIndex][session.key].length, 0);
        cell.innerHTML = `<strong>${name}</strong><span>${formatDate(date)}</span><span>${total} lớp</span>`;
        miniGrid.appendChild(cell);
      });
      details.appendChild(miniGrid);
      container.appendChild(details);
    });

    els.viewSemester.appendChild(container);
  }

  function createCard(entry, context) {
    const template = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const title = `${entry.courseName}${entry.group ? " – " + entry.group : ""}`;
    template.querySelector(".class-card-title").textContent = title;
    template.querySelector(".class-card-code").textContent = entry.courseCode || "";
    template.querySelector(".class-card-period").textContent = entry.periods ? `Tiết: ${entry.periods}` : "";
    template.querySelector(".class-card-room").textContent = entry.room ? `Phòng: ${entry.room}` : "";
    template.querySelector(".class-card-teacher").textContent = entry.teacher ? `GV: ${entry.teacher}` : "";
    template.dataset.weekIndex = context.weekIndex;
    template.dataset.dayIndex = context.dayIndex;
    template.dataset.session = context.session;
    template.dataset.courseCode = entry.courseCode || "";

    if (state.colorize && entry.courseCode) {
      const color = getColorForCourse(entry.courseCode);
      template.classList.add("card-colorized");
      template.style.borderColor = color;
    } else {
      template.style.borderColor = "";
      template.classList.remove("card-colorized");
    }

    if (state.detectClash && context.clashes.has(entry)) {
      template.classList.add("clash");
      const others = context.clashMap.get(entry) || [];
      template.title = `Trùng với: ${others.join(", ")}`;
    }

    template.addEventListener("click", () => openDetailPanel(entry));
    return template;
  }

  function filterEntry(entry, sessionKey) {
    if (!entry) return false;
    if (state.searchTerm) {
      const haystack = [entry.courseName, entry.courseCode, entry.room, entry.teacher, entry.group]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(state.searchTerm)) return false;
    }
    if (state.filters.teacher && entry.teacher !== state.filters.teacher) return false;
    if (state.filters.course && entry.courseName !== state.filters.course) return false;
    if (state.filters.code && entry.courseCode !== state.filters.code) return false;
    if (state.filters.room && entry.room !== state.filters.room) return false;
    if (state.filters.session && state.filters.session !== sessionKey) return false;
    return true;
  }

  function detectClashes(entries) {
    const clashSet = new Set();
    const clashGroup = new Map();
    for (let i = 0; i < entries.length; i++) {
      const a = entries[i];
      if (!a.periodRange) continue;
      for (let j = i + 1; j < entries.length; j++) {
        const b = entries[j];
        if (!b.periodRange) continue;
        if (rangesOverlap(a.periodRange, b.periodRange)) {
          clashSet.add(a);
          clashSet.add(b);
          const groupA = clashGroup.get(a) || [];
          groupA.push(b.courseCode || b.courseName);
          clashGroup.set(a, groupA);
          const groupB = clashGroup.get(b) || [];
          groupB.push(a.courseCode || a.courseName);
          clashGroup.set(b, groupB);
        }
      }
    }
    return { clashSet, clashGroup };
  }

  function rangesOverlap(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  function openDetailPanel(entry) {
    els.detailTitle.textContent = entry.courseName || "Chi tiết lớp";
    els.detailCode.textContent = entry.courseCode || "";
    els.detailGroup.textContent = entry.group || "";
    els.detailPeriods.textContent = entry.periods || "";
    els.detailRoom.textContent = entry.room || "";
    els.detailTeacher.textContent = entry.teacher || "";
    if (entry.href) {
      els.detailLink.innerHTML = `<a href="${entry.href}" target="_blank" rel="noopener">${entry.href}</a>`;
    } else {
      els.detailLink.textContent = "";
    }
    els.detailPanel.classList.add("open");
    els.detailPanel.setAttribute("aria-hidden", "false");
  }

  function closeDetailPanel() {
    els.detailPanel.classList.remove("open");
    els.detailPanel.setAttribute("aria-hidden", "true");
  }

  function copyDetailInfo() {
    const lines = [
      els.detailTitle.textContent,
      els.detailCode.textContent ? `Mã lớp: ${els.detailCode.textContent}` : "",
      els.detailGroup.textContent ? `Nhóm / Lớp: ${els.detailGroup.textContent}` : "",
      els.detailPeriods.textContent ? `Tiết: ${els.detailPeriods.textContent}` : "",
      els.detailRoom.textContent ? `Phòng: ${els.detailRoom.textContent}` : "",
      els.detailTeacher.textContent ? `GV: ${els.detailTeacher.textContent}` : "",
      els.detailLink.textContent ? `Link: ${els.detailLink.textContent}` : ""
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      showToast("Đã sao chép chi tiết lớp.");
    });
  }

  function switchTab(tabName) {
    els.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === tabName));
    [els.viewWeek, els.viewDay, els.viewSemester].forEach(view => view.classList.remove("active"));
    if (tabName === "week") {
      els.viewWeek.classList.add("active");
    } else if (tabName === "day") {
      els.viewDay.classList.add("active");
    } else {
      els.viewSemester.classList.add("active");
    }
  }

  function updateControlsAvailability(enabled) {
    const controls = [
      els.weekSelect,
      els.datePicker,
      els.searchInput,
      els.teacherFilter,
      els.courseFilter,
      els.codeFilter,
      els.roomFilter,
      els.sessionFilter,
      els.colorToggle,
      els.clashToggle,
      els.exportJsonBtn,
      els.exportCsvBtn,
      els.printBtn
    ];
    controls.forEach(control => (control.disabled = !enabled));
  }

  function updateAlertBar() {
    if (!state.schedule) {
      hideAlert();
      return;
    }
    const meta = state.schedule.meta;
    if (!meta.updateDate) {
      hideAlert();
      return;
    }
    const todayMonday = startOfWeek(new Date());
    const updateMonday = startOfWeek(meta.updateDate);
    const diffWeeks = Math.round((todayMonday - updateMonday) / (7 * 24 * 60 * 60 * 1000));
    let message = `Tuần cập nhật Lịch giảng: ${formatDate(meta.updateDate)}.`;
    els.alertBar.classList.remove("stale", "fresh", "hidden");
    if (diffWeeks > 0) {
      message += ` Đây là dữ liệu Lịch giảng cũ, cách đây ${diffWeeks} tuần. Yêu cầu cập nhật!`;
      els.alertBar.classList.add("stale");
    } else {
      message += " Dữ liệu Lịch giảng đã được cập nhật đến tuần hiện tại!";
      els.alertBar.classList.add("fresh");
    }
    els.alertText.textContent = message;
  }

  function hideAlert() {
    els.alertBar.classList.add("hidden");
  }

  function selectWeekContaining(date) {
    const index = findWeekIndexByDate(date);
    if (index !== -1) {
      state.currentWeekIndex = index;
      els.weekSelect.value = String(index);
      const week = state.schedule.weeks[index];
      state.selectedDate = date;
      els.datePicker.value = formatInputDate(date);
      renderAll();
    }
  }

  function exportJSON() {
    if (!state.schedule) return;
    const data = {
      meta: {
        ...state.schedule.meta,
        updateDate: state.schedule.meta.updateDate ? state.schedule.meta.updateDate.toISOString() : null
      },
      weeks: state.schedule.weeks.map(week => ({
        from: week.from.toISOString(),
        to: week.to.toISOString(),
        updateDate: week.updateDate ? week.updateDate.toISOString() : null,
        days: week.days.map(day => ({
          morning: day.morning.map(entryToPlain),
          afternoon: day.afternoon.map(entryToPlain),
          evening: day.evening.map(entryToPlain)
        }))
      }))
    };
    downloadFile(JSON.stringify(data, null, 2), "application/json", "timetable.json");
    showToast("Đã xuất tệp.");
  }

  function exportCSV() {
    if (!state.schedule) return;
    const lines = ["week_from,week_to,date,session,courseCode,courseName,group,periods,room,teacher"];
    state.schedule.weeks.forEach(week => {
      week.days.forEach((day, dayIndex) => {
        const date = addDays(week.from, dayIndex);
        sessionNames.forEach(session => {
          day[session.key].forEach(entry => {
            const fields = [
              formatDate(week.from),
              formatDate(week.to),
              formatDate(date),
              session.label,
              escapeCsv(entry.courseCode),
              escapeCsv(entry.courseName),
              escapeCsv(entry.group),
              escapeCsv(entry.periods),
              escapeCsv(entry.room),
              escapeCsv(entry.teacher)
            ];
            lines.push(fields.join(","));
          });
        });
      });
    });
    downloadFile(lines.join("\n"), "text/csv", "timetable.csv");
    showToast("Đã xuất tệp.");
  }

  function entryToPlain(entry) {
    return {
      courseCode: entry.courseCode,
      courseName: entry.courseName,
      group: entry.group,
      periods: entry.periods,
      room: entry.room,
      teacher: entry.teacher,
      href: entry.href,
      date: entry.date ? entry.date.toISOString() : null
    };
  }

  function downloadFile(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function escapeCsv(value) {
    if (!value) return "";
    const text = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(text)) {
      return `"${text}"`;
    }
    return text;
  }

  function findWeekIndexByDate(date) {
    if (!state.schedule) return -1;
    return state.schedule.weeks.findIndex(week => weekContainsDate(week, date));
  }

  function weekContainsDate(week, date) {
    if (!date) return false;
    return date >= startOfDay(week.from) && date <= endOfDay(week.to);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function endOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function parseDMY(str) {
    const [day, month, year] = str.split("/").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(date) {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }

  function formatInputDate(date) {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function startOfWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d;
  }

  function getColorForCourse(code) {
    if (!code) return "var(--primary)";
    if (!state.colorMap[code]) {
      const hash = hashString(code);
      const hue = hash % 360;
      const color = `hsl(${hue}, 70%, 55%)`;
      state.colorMap[code] = color;
      localStorage.setItem("tta-color-map", JSON.stringify(state.colorMap));
    }
    return state.colorMap[code];
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("tta-theme", state.theme);
    applyTheme(state.theme);
    els.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function focusSearch() {
    els.searchInput?.focus();
  }

  function resetApp() {
    state.schedule = null;
    state.currentWeekIndex = 0;
    state.searchTerm = "";
    state.selectedDate = null;
    state.filters = { teacher: "", course: "", code: "", room: "", session: "" };
    updateControlsAvailability(false);
    els.weekSelect.innerHTML = "";
    els.datePicker.value = "";
    els.searchInput.value = "";
    [els.teacherFilter, els.courseFilter, els.codeFilter, els.roomFilter].forEach(sel => (sel.innerHTML = '<option value="">Tất cả</option>'));
    els.sessionFilter.value = "";
    els.colorToggle.checked = state.colorize;
    els.clashToggle.checked = false;
    hideAlert();
    renderAll();
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fade-out");
      const remove = () => toast.remove();
      toast.addEventListener("transitionend", remove, { once: true });
      setTimeout(remove, 400);
    }, 2800);
  }

  init();
  renderAll();
})();
