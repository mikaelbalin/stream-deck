export interface KeyBinding {
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	meta: boolean;
	code: string;
}

function formatCode(code: string): string {
	if (code.startsWith("Key")) return code.slice(3);
	if (code.startsWith("Digit")) return code.slice(5);
	const map: Record<string, string> = {
		Space: "Space",
		Enter: "Enter",
		Tab: "Tab",
		Escape: "Esc",
		Backspace: "Backspace",
		Delete: "Del",
		Insert: "Ins",
		Home: "Home",
		End: "End",
		PageUp: "PgUp",
		PageDown: "PgDn",
		ArrowUp: "↑",
		ArrowDown: "↓",
		ArrowLeft: "←",
		ArrowRight: "→",
		MediaPlayPause: "Play/Pause",
		MediaTrackNext: "Next",
		MediaTrackPrevious: "Prev",
		MediaStop: "Stop",
		AudioVolumeUp: "Vol+",
		AudioVolumeDown: "Vol−",
		AudioVolumeMute: "Mute",
		Minus: "-",
		Equal: "=",
		BracketLeft: "[",
		BracketRight: "]",
		Semicolon: ";",
		Quote: "'",
		Backquote: "`",
		Backslash: "\\",
		Comma: ",",
		Period: ".",
		Slash: "/",
	};
	return map[code] ?? code;
}

export function bindingParts(binding: KeyBinding): string[] {
	const parts: string[] = [];
	if (binding.ctrl) parts.push("Ctrl");
	if (binding.shift) parts.push("Shift");
	if (binding.alt) parts.push("Alt");
	if (binding.meta) parts.push("Super");
	parts.push(formatCode(binding.code));
	return parts;
}
