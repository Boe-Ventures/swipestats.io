"use client";

import type * as React from "react";
import type { Control, FieldPath, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";

import type { JSONContent } from "@tiptap/core";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";

/**
 * Form field wrapper for Tiptap rich text editor
 * This is a placeholder/template for when you want to use TiptapEditor in forms.
 *
 * NOTE: You'll need to import TiptapEditor from your app's components
 * since it's not in the shared UI package.
 *
 * Usage in your app:
 *
 * import { RichTextareaField } from "@acme/ui/form-inputs/rich-textarea-field";
 * import { TiptapEditor } from "@/components/tiptap/TiptapEditor";
 *
 * <RichTextareaField
 *   control={form.control}
 *   name="description"
 *   label="Description"
 *   placeholder="Enter rich text..."
 *   editorComponent={TiptapEditor}
 * />
 */

interface RichTextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  maxLength?: number;
  /**
   * Pass your TiptapEditor component here since it's app-specific
   */
  editorComponent: React.ComponentType<{
    content: JSONContent | string;
    onChange: (json: JSONContent, text: string, markdown: string) => void;
    placeholder?: string;
    editable?: boolean;
    className?: string;
    showToolbar?: boolean;
    enableMentions?: boolean;
    contentType?: "markdown" | "json";
  }>;
  /**
   * Optional: If you need to store both JSON and text, provide the text field name
   * This will automatically update both fields
   */
  textFieldName?: Path<TFieldValues>;
  /**
   * Optional: If you need to store markdown, provide the markdown field name
   * This will automatically update the markdown field with converted content
   */
  markdownFieldName?: Path<TFieldValues>;
  /**
   * Optional: Additional props to pass to the editor component
   */
  editorProps?: {
    showToolbar?: boolean;
    enableMentions?: boolean;
    contentType?: "markdown" | "json";
  };
}

export function RichTextareaField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
  className,
  required,
  maxLength = 2000,
  editorComponent: EditorComponent,
  textFieldName,
  markdownFieldName,
  editorProps,
}: RichTextareaFieldProps<TFieldValues, TName>) {
  // Always call useController to maintain hook order
  // Use useController for the text field if provided
  const textFieldController = useController({
    control,
    name: (textFieldName ?? name) as Path<TFieldValues>,
    disabled: !textFieldName,
  });

  // Use useController for the markdown field if provided
  const markdownFieldController = useController({
    control,
    name: (markdownFieldName ?? name) as Path<TFieldValues>,
    disabled: !markdownFieldName,
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Use markdown field for character count if available, otherwise text field
        const characterCount = markdownFieldName
          ? markdownFieldController.field.value
            ? String(markdownFieldController.field.value).length
            : 0
          : textFieldName && textFieldController.field.value
            ? String(textFieldController.field.value).length
            : 0;

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
            )}
            <FormControl>
              <EditorComponent
                content={field.value as JSONContent | string}
                onChange={(json, text, markdown) => {
                  field.onChange(json);
                  // Update text field if provided
                  if (textFieldName) {
                    textFieldController.field.onChange(text);
                  }
                  // Update markdown field if provided
                  if (markdownFieldName) {
                    markdownFieldController.field.onChange(markdown);
                  }
                }}
                placeholder={placeholder}
                editable={!disabled}
                className="min-h-[100px]"
                {...editorProps}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <div className="flex items-center justify-between">
              <FormMessage />
              {maxLength && (
                <span className="text-muted-foreground text-xs">
                  {characterCount}/{maxLength} characters
                </span>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
