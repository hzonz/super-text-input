// used base code from: https://github.com/delphiki/lovelace-pronote/blob/742076718f49f4557aee77ebd36bc0dbdd3ad281/src/editors/base-editor.js


const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class BaseCardEditor extends LitElement {
	static get properties() {
		return {
			_config: { type: Object },
		};
	}

	setConfig(config) {
		this._config = config;
		this.loadEntityPicker();
	}

	_valueChanged(ev) {
		const newConfig = {
			...this._config,
			[ev.target.configValue]: ev.detail?.value ?? ev.target.value,
		};

		this._config = newConfig;

		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config: newConfig },
				bubbles: true,
				composed: true,
			})
		);
	}

	/**
	 * Creates a YAML editor instance with optimized update handling
	 * Key features:
	 * - Maintains editor state during updates
	 * - Properly propagates changes upward
	 * - Uses timestamp tracking to prevent render cycles
	 */

	buildYamlEditor(label, config_key, value, default_value) {
		const editor = document.createElement("ha-yaml-editor");
		editor.label = label;
		editor.name = config_key;
		editor.defaultValue = value || default_value;

		editor.addEventListener("value-changed", (ev) => {
			// Mark timestamp to prevent immediate re-render
			this._lastYamlUpdate = Date.now();

			// Update config and propagate change
			const newConfig = {
				...this._config,
				[config_key]: ev.detail.value,
			};

			this.dispatchEvent(
				new CustomEvent("config-changed", {
					detail: { config: newConfig },
					bubbles: true,
					composed: true,
				})
			);
		});
		return editor;
	}

	buildSelectField(label, config_key, options, value, default_value) {
		let selectOptions = [];
		for (let i = 0; i < options.length; i++) {
			let currentOption = options[i];
			selectOptions.push(html`<ha-list-item .value="${currentOption.value}">${currentOption.label}</ha-list-item>`);
		}

		return html`
			<ha-select
				label="${label}"
				.value=${value || default_value}
				.configValue=${config_key}
				@change=${this._valueChanged}
				@closed=${(ev) => ev.stopPropagation()}
			>
				${selectOptions}
			</ha-select>
		`;
	}

	buildSwitchField(label, config_key, value, default_value) {
		if (typeof value !== "boolean") {
			value = default_value;
		}

		return html`
			<ha-selector-boolean>
				<label for="display_header">${label}</label>
				<ha-switch
					name="${config_key}"
					.checked=${value}
					.configValue="${config_key}"
					@change=${this._valueChanged}
				></ha-switch>
			</ha-selector-boolean>
		`;
	}

	buildNumberField(label, config_key, value, default_value, step) {
		return html`
			<ha-textfield
				type="number"
				step="${step || 1}"
				label="${label}"
				.value=${value || default_value}
				.configValue=${config_key}
				@change=${this._valueChanged}
			>
			</ha-textfield>
		`;
	}

	buildTextField(label, config_key, value, default_value = "") {
		return html`
			<ha-textfield
				label="${label}"
				.value=${value || default_value}
				.configValue=${config_key}
				@change=${this._valueChanged}
				@keyup=${this._valueChanged}
			>
			</ha-textfield>
		`;
	}

	buildEntityPickerField(label, config_key, value, domains, contains) {
		const entityFilter = contains ? (entity) => entity.entity_id.toLowerCase().includes(contains.toLowerCase()) : null;

		return html`
			<ha-entity-picker
				label="${label}"
				.hass=${this.hass}
				.value=${value || ""}
				.configValue=${config_key}
				.includeDomains=${domains}
				.entityFilter=${entityFilter}
				@value-changed=${this._valueChanged}
				allow-custom-entity
			></ha-entity-picker>
		`;
	}

	async loadEntityPicker() {
		if (window.customElements.get("ha-entity-picker")) {
			return;
		}

		const ch = await window.loadCardHelpers();
		const c = await ch.createCardElement({ type: "entities", entities: [] });
		await c.constructor.getConfigElement();
	}

	static get styles() {
		return css`
			ha-selector-boolean {
				display: block;
				padding-top: 20px;
				clear: right;
			}
			ha-selector-boolean > ha-switch {
				float: right;
			}
			ha-select,
			ha-textfield {
				clear: right;
				width: 100%;
				padding-top: 15px;
			}
		`;
	}
}

export default BaseCardEditor;
