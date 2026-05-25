// --- AUTO-REPARATUR FÜR KAPUTTE WELT-DATA-MODELS (V14) ---
Hooks.on('preCreateItem', (document, data, options, userId) => {
  if (document.id === "79NslkwJDqDkjTd6") document.updateSource({"system.target.template.size": 9});
  if (document.id === "0cZmtnAIKAjvygU6") document.updateSource({"system.activities": {}});
});

Hooks.once('init', () => {
  console.log("========================================");
  console.log("JSON-UPLOADER: MODUL ERFOLGREICH GESTARTET!");
  console.log("========================================");

  const originalFromSource = CONFIG.Item.documentClass.fromSource;
  CONFIG.Item.documentClass.fromSource = function(source, options={}) {
    if (source._id === "79NslkwJDqDkjTd6" && source.system?.target?.template?.size === "9m") {
      source.system.target.template.size = 9;
    }
    if (source._id === "0cZmtnAIKAjvygU6" && source.system) {
      source.system.activities = {};
    }
    return originalFromSource.call(this, source, options);
  };

  game.socket.on('module.json-uploader', async (data) => {
    if (!game.user.isGM) return;
    if (data.action === "uploadMultiple") {
      try {
        let file;
        if (data.filename.endsWith('.json')) {
          file = new File([data.content], data.filename, { type: "application/json" });
        } else {
          const response = await fetch(data.content);
          const blob = await response.blob();
          file = new File([blob], data.filename, { type: blob.type });
        }
        await FilePicker.upload("data", data.targetPath, file, {});
      } catch (err) {
        console.error(`Fehler beim Server-Upload von ${data.filename}:`, err);
      }
    }
  });
});

// --- UI-INJEKTION (KOMBINIERTER METHODEN-MIX FÜR V14) ---
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  const list = Array.isArray(controls) ? controls : (typeof controls.values === 'function' ? Array.from(controls.values()) : Object.values(controls));
  const tokenControls = list.find(c => c.name === "token");
  if (tokenControls && tokenControls.tools) {
    const alreadyExists = tokenControls.tools.some(t => t.name === "json-uploader");
    if (!alreadyExists) {
      tokenControls.tools.push({
        name: "json-uploader",
        title: "Ordner-Inhalt hochladen",
        icon: "fas fa-folder-plus",
        visible: true,
        onClick: () => { new JSONUploaderFormV14().render(true); },
        button: true
      });
    }
  }
});

Hooks.on('renderSceneControls', (controlsApp, html) => {
  if (!game.user.isGM) return;
  setTimeout(() => {
    if (document.querySelector('[data-tool="json-uploader"]')) return;
    const subNav = document.querySelector('[data-control="token"] .sub-controls, [data-control="token"] .control-tools, [data-control="token"] ul');
    if (subNav) {
      const activeClass = controlsApp.activeTool === "json-uploader" ? "active" : "";
      const buttonHtml = `
        <li class="control-tool ${activeClass}" data-tool="json-uploader" title="Ordner-Inhalt hochladen">
          <i class="fas fa-folder-plus"></i>
        </li>
      `;
      subNav.insertAdjacentHTML('beforeend', buttonHtml);
      const btnElement = subNav.querySelector('[data-tool="json-uploader"]');
      if (btnElement) {
        btnElement.addEventListener('click', (ev) => {
          ev.preventDefault();
          new JSONUploaderFormV14().render(true);
        });
      }
    }
  }, 150);
});

class JSONUploaderFormV14 extends foundry.applications.api.ApplicationV2 {
  constructor(options={}) { super(options); }
  static DEFAULT_OPTIONS = {
    id: "json-uploader-form",
    window: { title: "Ordner-Inhalt in Foundry hochladen", resizable: true },
    position: { width: 500, height: "auto" }
  };
  async _renderHTML(context, options) {
    return `
      <div style="padding: 15px;">
        <p>Wähle den Zielordner im Foundry-Server aus und markiere die Dateien von deinem PC.</p>
        <hr>
        <div class="form-group" style="margin-bottom: 15px;">
          <label><b>1. Zielordner auf dem Foundry-Server:</b></label>
          <div class="form-fields" style="display: flex; gap: 5px; margin-top: 5px;">
            <input type="text" id="target-path" placeholder="data/modules/ziel-modul/ordner" style="flex: 1;">
            <button type="button" class="browse-btn" style="flex: 0 0 40px;"><i class="fas fa-folder-open"></i></button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 20px;">
          <label><b>2. Dateien vom PC (z.B. .jpg und .json zusammen markieren):</b></label>
          <input type="file" id="file-input" multiple style="margin-top: 5px; display: block;">
        </div>
        <button type="button" id="start-upload" style="width: 100%; font-weight: bold; padding: 8px;"><i class="fas fa-cloud-upload-alt"></i> Alle Dateien hochladen</button>
      </div>
    `;
  }
  _replaceHTML(html, newHTML, options) {
    super._replaceHTML(html, newHTML, options);
    const element = $(this.element);
    element.find('.browse-btn').click(async (ev) => {
      new FilePicker({
        type: "folder",
        current: "data/",
        callback: path => { element.find('#target-path').val(path); }
      }).browse();
    });
    element.find('#start-upload').click(async () => {
      const targetPath = element.find('#target-path').val();
      const files = element.find('#file-input')[0].files;
      if (!targetPath || files.length === 0) return ui.notifications.warn("Bitte Zielordner und Dateien auswählen!");
      ui.notifications.info(`Starte Upload von ${files.length} Dateien...`);
      for (let file of files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target.result;
          game.socket.emit('module.json-uploader', {
            action: "uploadMultiple",
            filename: file.name,
            targetPath: targetPath,
            content: content
          });
          try {
            let fileObj;
            if (file.name.endsWith('.json')) {
              fileObj = new File([content], file.name, { type: "application/json" });
            } else {
              const response = await fetch(content);
              const blob = await response.blob();
              fileObj = new File([blob], file.name, { type: file.type });
            }
            await FilePicker.upload("data", targetPath, fileObj, {});
          } catch (err) {
            ui.notifications.error(`Fehler bei ${file.name}: ${err.message}`);
          }
        };
        if (file.name.endsWith('.json')) { reader.readAsText(file); } else { reader.readAsDataURL(file); }
      }
      ui.notifications.info("Upload abgeschlossen!");
      this.close();
    });
  }
}