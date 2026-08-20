import { Keyboard, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { bindingParts, type KeyBinding } from "@/src/utils/key-binding";

interface PedalProps {
	label: string;
	position: "left" | "middle" | "right";
	binding: KeyBinding | null;
	pressed: boolean;
	isRecording: boolean;
	onClear: () => void;
	onToggleRecording: () => void;
}

export function Pedal({
	label,
	position,
	binding,
	pressed,
	isRecording,
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
				{/*<CardDescription/>*/}
				{/*<CardAction>
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						Locked
						<Lock className="size-4" />
					</div>
				</CardAction>*/}
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<div
					className={cn(
						"relative flex min-h-28 items-center justify-center overflow-hidden rounded-none transition-colors duration-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--border)_10px,var(--border)_11px)]",
						position === "left" && "rounded-l-lg",
						position === "right" && "rounded-r-lg",
						pressed ? "bg-blue-300 dark:bg-blue-900" : "bg-accent",
					)}
				/>

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
								aria-label="Clear"
								onClick={onClear}
							>
								<XIcon />
							</InputGroupButton>
						)}
						<InputGroupButton
							size="icon-xs"
							aria-label={isRecording ? "Cancel" : "Record"}
							onClick={onToggleRecording}
						>
							{isRecording ? <XIcon /> : <Keyboard />}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</CardContent>
		</Card>
	);
}
