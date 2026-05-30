// VERSION 1.4.3 - APPLICATION V2 CONTENT FORCE BUILD
// --- CORE-DATEN-SANIERUNG VOR JEDER VALIDIERUNG (V14) ---
Hooks.once('init', () => {
  console.log("========================================");
  console.log("JSON-UPLOADER: CORE-REGISTRIERUNG ERFOLGREICH (V1.4.3)");
  console.log("========================================");

  const originalCleanData = CONFIG.Item.documentClass.cleanData;
  CONFIG.Item.documentClass.cleanData = function(source, options={}) {
    if (source) {
      if (source._id === "79NslkwJDqDkjTd6" || source.id === "79NslkwJDqDkjTd6") {
        if (source.system?.target?.template?.size === "9m") {
          source.system.target.template.size = 9;
        }
      }
      if (source._id === "0cZmtnAIKAjvygU6" || source.id === "0cZmtnAIKAjvygU6") {
        if (source.system) {
          source.system.activities = {};
        }
      }
    }
    return originalCleanData.call(this, source, options);
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

// --- UI-INJEKTION IN DIE GLOBALEN STEUERELEMENTE ---
const injectUploaderButton = (controls) => {
  if (!game.user.isGM || !controls) return;
  
  const list = Array.isArray(controls) ? controls : (typeof controls.values === 'function' ? Array.from(controls.values()) : Object.values(controls));
  const mainControls = list.find(c => c && c.name === "main");
  if (mainControls && mainControls.tools) {
    const alreadyExists = mainControls.tools.some(t => t.name === "json-uploader");
    if (!alreadyExists) {
      mainControls.tools.push({
        name: "json-uploader",
        title: "Ordner-Inhalt hochladen",
        icon: "fas fa-folder-plus",
        visible: true,
        onClick: () => { new JSONUploaderFormV14().render(true); },
        button: true
      });
    }
  }
};

Hooks.on("initializeSceneControls", (controls) => injectUploaderButton(controls));
Hooks.on("getSceneControlButtons", (controls) => injectUploaderButton(controls));

// --- MUTATION OBSERVER FÜR UI-PERSISTENZ ---
Hooks.once('ready', () => {
  if (!game.user.isGM) return;

  const forceButtonInjection = () => {
    if (document.querySelector('[data-tool="json-uploader"]')) return;

    const mainNav = document.querySelector('.main-controls, #controls ul.main-controls');
    if (mainNav) {
      const buttonHtml = `
        <li class="control-tool" data-tool="json-uploader" title="Ordner-Inhalt hochladen">
          <i class="fas fa-folder-plus"></i>
        </li>
      `;
      mainNav.insertAdjacentHTML('beforeend', buttonHtml);
      
      const btnElement = document.querySelector('[data-tool="json-uploader"]');
      if (btnElement) {
        btnElement.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          new JSONUploaderFormV14().render(true);
        });
      }
    }
  };

  const observer = new MutationObserver(() => forceButtonInjection());
  const uiControlsElement = document.getElementById('ui-left');
  if (uiControlsElement) {
    observer.observe(uiControlsElement, { childList: true, subtree: true });
  }
  
  forceButtonInjection();
});

// Offizielle, vollkonforme Foundry V14 ApplicationV2 Implementierung
class JSONUploaderFormV14 extends foundry.applications.api.ApplicationV2 {
  constructor(options={}) { super(options); }
  
  static DEFAULT_OPTIONS = {
    id: "json-uploader-form",
    window: { title: "Ordner-Inhalt in Foundry hochladen", resizable: true },
    position: { width: 500, height: "auto" }
  };

  // V14 verlangt im neuen Framework zwingend ein HTML-Template-String oder Fragment über den internen Render-Lebenszyklus
  async _renderHTML(context, options) {
    return `
      <div class="json-uploader-content" style="padding: 15px;">
        <p style="margin-bottom: 10px;">Wähle den Zielordner im Foundry-Server aus und markiere die Dateien von deinem PC.</p>
        <hr style="margin-bottom: 15px;">
        <div class="form-group" style="margin-bottom: 15px;">
          <label style="display: block; font-weight: bold; margin-bottom: 5px;">1. Zielordner auf dem Foundry-Server:</label>
          <div class="form-fields" style="display: flex; gap: 5px;">
            <input type="text" id="target-path" placeholder="data/modules/ziel-modul/ordner" style="flex: 1; padding: 4px;">
            <button type="button" class="browse-btn" style="flex: 0 0 40px; cursor: pointer;"><i class="fas fa-folder-open"></i></button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; font-weight: bold; margin-bottom: 5px;">2. Dateien vom PC (z.B. .jpg und .json zusammen markieren):</label>
          <input type="file" id="file-input" multiple style="display: block; width: 100%;">
        </div>
        <button type="button" id="start-upload" style="width: 100%; font-weight: bold; padding: 8px; cursor: pointer;"><i class="fas fa-cloud-upload-alt"></i> Alle Dateien hochladen</button>
      </div>
    `;
  }

  // Dieser Schritt injiziert den gerenderten Inhalt direkt in das von ApplicationV2 erzeugte Fenster-Innere (window.content)
  _replaceHTML(html, newHTML, options) {
    const contentContainer = this.window.content || this.element;
    if (!contentContainer) return;
    
    // HTML sicher einsetzen
    contentContainer.innerHTML = html;

    // Listener an die frisch gerenderten DOM-Elemente binden
    const browseBtn = contentContainer.querySelector('.browse-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        new FilePicker({
          type: "folder",
          current: "data/",
          callback: path => { 
            const input = contentContainer.querySelector('#target-path');
            if (input) input.value = path; 
          }
        }).browse();
      });
    }

    const uploadBtn = contentContainer.querySelector('#start-upload');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const targetPath = contentContainer.querySelector('#target-path')?.value;
        const fileInput = contentContainer.querySelector('#file-input');
        const files = fileInput ? fileInput.files : [];
        
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
}

// Global freigeben für Makros und Konsole
window.JSONUploaderFormV14 = JSONUploaderFormV14;