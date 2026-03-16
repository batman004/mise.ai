import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface UserAvatarProps {
  id: string;
  username: string;
}

export function UserAvatar({ id, username }: UserAvatarProps) {
  return (
    <Avatar className="rounded-lg grayscale">
      <AvatarImage src={`/avatar/${id}`} alt={username} />
      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold">
        {username
          .match(/\b(\w)/g)
          ?.join("")
          .toLocaleUpperCase() || "U"}
      </AvatarFallback>
    </Avatar>
  );
}
