import { Keyboard, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { BindingKind } from "@/src/hooks/use-bindings";
import {
	bindingParts,
	type KeyBinding,
	type PedalBinding,
} from "@/src/utils/key-binding";

interface PedalProps {
	label: string;
	position: "left" | "middle" | "right";
	binding: PedalBinding;
	pressed: boolean;
	held: boolean;
	recordingKind: BindingKind | null;
	onClear: (kind: BindingKind) => void;
	onToggleRecording: (kind: BindingKind) => void;
}

interface BindingFieldProps {
	label: string;
	binding: KeyBinding | null;
	isRecording: boolean;
	onClear: () => void;
	onToggleRecording: () => void;
}

function BindingField({
	label,
	binding,
	isRecording,
	onClear,
	onToggleRecording,
}: BindingFieldProps) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<InputGroup className="justify-between">
				{isRecording ? (
					<InputGroupInput placeholder="Press a key…" readOnly />
				) : binding ? (
					<InputGroupAddon align="inline-start">
						{bindingParts(binding).map((part) => (
							<Kbd key={part}>{part}</Kbd>
						))}
					</InputGroupAddon>
				) : (
					<InputGroupAddon align="inline-start">
						<InputGroupText>Not set</InputGroupText>
					</InputGroupAddon>
				)}

				<InputGroupAddon align="inline-end">
					{binding && !isRecording && (
						<InputGroupButton
							size="icon-xs"
							aria-label={`Clear ${label}`}
							onClick={onClear}
						>
							<XIcon />
						</InputGroupButton>
					)}
					<InputGroupButton
						size="icon-xs"
						aria-label={isRecording ? "Cancel" : `Record ${label}`}
						onClick={onToggleRecording}
					>
						{isRecording ? <XIcon /> : <Keyboard />}
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</Field>
	);
}

export function Pedal({
	label,
	position,
	binding,
	pressed,
	held,
	recordingKind,
	onClear,
	onToggleRecording,
}: PedalProps) {
	return (
		<Card
			className={cn(
				"flex-1 rounded-none",
				position === "left" && "rounded-l-xl",
				position === "right" && "rounded-r-xl",
			)}
		>
			<CardHeader>
				<CardTitle>{label}</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<div
					className={cn(
						"relative flex min-h-28 items-center justify-center overflow-hidden rounded-none transition-colors duration-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--border)_10px,var(--border)_11px)]",
						position === "left" && "rounded-l-lg",
						position === "right" && "rounded-r-lg",
						held
							? "bg-purple-300 dark:bg-purple-900"
							: pressed
								? "bg-blue-300 dark:bg-blue-900"
								: "bg-accent",
					)}
				/>

				<BindingField
					label="Tap"
					binding={binding.tap}
					isRecording={recordingKind === "tap"}
					onClear={() => onClear("tap")}
					onToggleRecording={() => onToggleRecording("tap")}
				/>
				<BindingField
					label="Hold"
					binding={binding.hold}
					isRecording={recordingKind === "hold"}
					onClear={() => onClear("hold")}
					onToggleRecording={() => onToggleRecording("hold")}
				/>
			</CardContent>
		</Card>
	);
}
