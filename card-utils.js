// Default style constants used across custom cards
export const CARD_HEIGHT = "56px";
export const DEFAULT_PADDING = "10px";
export const DEFAULT_BUTTON_SIZE = 36;
export const DEFAULT_BUTTON_STYLE = {
	color: "var(--blue-color)",
	"border-radius": "50%",
	background: "rgb(from var(--blue-color) r g b / 0.2)",
};

// Add separate defaults for structural properties
export const DEFAULT_BUTTON_PROPERTIES = {
	size: "36px",
	icon_size: "24px",
};

const PREBUILT_ACTIONS = (entity_id) => {
	const domain = entity_id.split(".")[0];
	return {
		clear: {
			action: "call-service",
			service: `${domain}.set_value`,
			data: {
				value: "",
			},
			target: {
				entity_id: entity_id,
			},
		},
		toast: {
			action: "fire-dom-event",
			browser_mod: {
				service: "notification",
				data: {
					message: "{{ value }}",
				},
			},
		},
		"more-info": {
			action: "more-info",
			entity: entity_id,
		},
	};
};

// Button Utilities
/**
 * Calculates button margins to ensure proper spacing and alignment
 * @param {string} size - Button size specified in configuration
 * @param {string} position - Button position ('start' or 'end')
 * @param {boolean} isAdditionalButton - Whether this button is part of a sequence
 * @param {Object} style - Custom style configuration object
 * @returns {Object} Calculated left and right margins
 */
export function calculateButtonMargins(size, position, isAdditionalButton, style) {
	// Convert size string to number for calculations
	const sizeValue = parseInt(size);

	// Calculate size difference from default button size
	// Used to adjust margins when buttons are smaller/larger than default
	const difference = DEFAULT_BUTTON_SIZE - sizeValue;

	// Calculate half of the difference, but never less than 0
	// This ensures even spacing around the button
	const halfDiff = difference > 0 ? difference / 2 : 0;

	return {
		// Left margin logic:
		// - Use custom margin if provided
		// - For end position: add 8px spacing plus half the size difference
		// - For start position: add 8px only for additional buttons in sequence
		left:
			style["margin-left"] ||
			(position === "end" ? `${halfDiff + 8}px` : `${isAdditionalButton ? halfDiff + 8 : halfDiff}px`),

		// Right margin is always half the size difference
		// Unless custom margin is provided
		right: style["margin-right"] || `${halfDiff}px`,
	};
}

/**
 * Applies styles to a button element
 * @param {HTMLElement} button - The button element to style
 * @param {Object} style - Style configuration
 * @param {boolean} isAdditionalButton - Whether this is an additional button
 * @param {string} position - Button position
 */
export function getButtonStyles(button, buttonConfig, isAdditionalButton, position) {
	const style = { ...DEFAULT_BUTTON_STYLE, ...buttonConfig.style };
	const size = buttonConfig.size || DEFAULT_BUTTON_PROPERTIES.size;

	button.style.setProperty("--mdc-icon-button-size", size);

	const margins = calculateButtonMargins(size, position, isAdditionalButton, style);
	button.style.marginLeft = margins.left;
	button.style.marginRight = margins.right;

	button.style.setProperty("background-color", style.background || `rgb(from ${style.color} r g b / 0.2)`);
	button.style.setProperty("border-radius", style["border-radius"] || "50%");
}

/**
 * Applies styles to an icon element
 * @param {HTMLElement} icon - The icon element to style
 * @param {Object} style - Style configuration
 */
export function getIconStyles(icon, buttonConfig) {
	const style = { ...DEFAULT_BUTTON_STYLE, ...buttonConfig.style };
	icon.style.setProperty("--mdc-icon-size", buttonConfig.icon_size || DEFAULT_BUTTON_PROPERTIES.icon_size);
	icon.style.display = "flex";
	icon.style.alignItems = "flex-start";
	icon.style.setProperty("color", style.color);
}

/**
 * Applies styles to a container element
 * @param {HTMLElement} container - The container element to style
 * @param {boolean} isEnd - Whether this is an end-positioned container
 */
export function getContainerStyles(container, isEnd = false) {
	container.className = "container";
	container.id = isEnd ? "trailingContainer" : "leadingContainer";
	container.style.display = "flex";
	container.style.flexDirection = "row";
	container.style.alignItems = "center";
	if (isEnd) container.style.marginLeft = "auto";
}

/**
 * Handles action events for buttons
 * @param {Object} actionConfig - Action configuration
 * @param {string} value - Current value
 * @param {HTMLElement} element - Element to dispatch event from
 */
export function handleAction(actionConfig, value, element) {
	if (!actionConfig) return;

	const processedConfig = JSON.parse(JSON.stringify(actionConfig).replace(/\{\{\s*value\s*\}\}/g, value));

	const event = new Event("hass-action", {
		bubbles: true,
		composed: true,
	});
	event.detail = {
		config: {
			tap_action: processedConfig,
		},
		action: "tap",
	};
	element.dispatchEvent(event);
}

/**
 * Debounces a function call
 * @param {Function} callback - Function to debounce
 * @param {number} waitTime - Time to wait in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(callback, waitTime) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => callback(...args), waitTime);
	};
}

/**
 * Extracts object ID from entity ID
 * @param {string} entityId - Full entity ID
 * @returns {string} Object ID portion
 */
export function computeObjectId(entityId) {
	return entityId.substring(entityId.indexOf(".") + 1);
}

/**
 * Computes friendly name for an entity
 * @param {Object} stateObj - Entity state object
 * @param {string} entityId - Entity ID
 * @returns {string} Computed name
 */
export function computeStateName(stateObj, entityId) {
	return stateObj.attributes.friendly_name === undefined
		? computeObjectId(entityId).replace(/_/g, " ")
		: stateObj.attributes.friendly_name || "";
}

/**
 * Factory class for creating button elements
 */
export class ButtonFactory {
	/**
	 * @param {Object} config - Card configuration
	 * @param {HTMLElement} element - Parent element
	 */
	constructor(config, element) {
		this._config = config;
		this._element = element;
	}

	/**
	 * Creates a container for buttons (at beginning or end of row)
	 * @param {boolean} isEnd - Whether this is an end-positioned container
	 * @param {Array} buttons - Array of button configurations
	 * @returns {HTMLElement} Button container
	 */
	createButtonContainer(isEnd = false, buttons) {
		const container = document.createElement("div");
		getContainerStyles(container, isEnd);

		const filteredButtons = buttons
			.filter((btn) => (isEnd ? btn.position === "end" : !btn.position || btn.position === "start"))
			.map((btn, index) => this.createIconButton(btn, index, btn.position));

		filteredButtons.forEach((button) => container.appendChild(button));
		return container;
	}

	/**
	 * Creates an icon button
	 * @param {Object} buttonConfig - Button configuration
	 * @param {number} index - Button index
	 * @param {string} position - Button position
	 * @returns {HTMLElement} Icon button
	 */
	createIconButton(buttonConfig, index, position) {
		const button = document.createElement("ha-icon-button");
		if (buttonConfig.id) button.id = buttonConfig.id;

		getButtonStyles(button, buttonConfig, index > 0, position);
		this._setupButtonAction(button, buttonConfig);
		this._addButtonIcon(button, buttonConfig.icon, buttonConfig);

		return button;
	}

	/**
	 * Sets up click handler for a button
	 * @private
	 */
	_setupButtonAction(button, config) {
		button.addEventListener("click", () => {
			if (config.tap_action) {
				handleAction(config.tap_action, this._element.value, this._element);
			} else if (config.template && PREBUILT_ACTIONS(this._config.entity)[config.template]) {
				const entity = config.entity || this._config.entity;
				handleAction(PREBUILT_ACTIONS(entity)[config.template], this._element.value, this._element);
				
			}
			// If no tap_action and no template or invalid template button has no action
		});
	}

	/**
	 * Adds an icon to a button
	 * @private
	 */
	_addButtonIcon(button, iconName, buttonConfig) {
		const icon = document.createElement("ha-icon");
		getIconStyles(icon, buttonConfig);
		icon.setAttribute("icon", iconName);
		button.appendChild(icon);
	}
}
