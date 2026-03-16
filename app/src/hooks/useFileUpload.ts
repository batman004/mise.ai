import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/env";

interface FileUploadResponse {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

interface FileUploadOptions {
  workspace: string;
  label: string;
  notes?: string;
  user_id?: string;
  onSuccess?: (data: FileUploadResponse) => void;
  onError?: (error: Error) => void;
}

const uploadFile = async (
  file: File,
  workspace: string,
  label: string,
  notes?: string,
  user_id?: string
): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  //formData.append("workspace", workspace);
  formData.append("label", label);
  if (user_id) formData.append("user_id", user_id);
  if (notes) formData.append("notes", notes);

  const url = getApiUrl("data/upload");
  console.log("Uploading to:", url);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    // Check if it's a CORS error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "CORS error: Unable to connect to server. The upload may have succeeded on the server side."
      );
    }

    throw error;
  }
};

export const useFileUpload = ({
  workspace,
  label,
  notes,
  user_id,
  onSuccess,
  onError,
}: FileUploadOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, workspace, label, notes, user_id),
    onSuccess: (data) => {
      // Invalidate and refetch inventory data after successful upload
      queryClient.invalidateQueries({ queryKey: ["inventory", workspace] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryMetrics", workspace],
      });

      // Invalidate sales data queries to refresh after upload
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
};
