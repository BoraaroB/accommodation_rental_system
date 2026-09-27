import {
  tenantCreateSchema,
  type AdminTenant,
  type TenantCreateInput,
  type TenantUpdateInput,
} from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type FieldError } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { getApiError } from '../../../api/errors';
import { FormAlert } from '../../../components/FormAlert';
import { Button } from '../../../components/ui/button';
import { FormField } from '../../../components/ui/form-field';
import { Input } from '../../../components/ui/input';
import { useCreateTenantMutation, useUpdateTenantMutation } from '../api';
import { adminTenantPath, portalPath } from '../paths';

// A colour input always holds a colour; black is the browser's own default,
// shown while the field is empty or not yet a colour.
const PICKER_DEFAULT = '#000000';

const EMPTY_FORM: TenantCreateInput = {
  name: '',
  slug: '',
  logoUrl: null,
  primaryColor: null,
  contactEmail: null,
};

/** The configuration the form edits, as the tenant has it now. */
function configurationOf(tenant: AdminTenant): TenantCreateInput {
  const { name, slug, logoUrl, primaryColor, contactEmail } = tenant;
  return { name, slug, logoUrl, primaryColor, contactEmail };
}

/**
 * An optional field left blank is not set (`null`), not an empty string. It
 * also receives the default value, which may be `null`.
 */
function blankToNull(value: string | null): string | null {
  return value === null || value.trim() === '' ? null : value;
}

/**
 * Another tenant has the slug. Two requests racing for one slug get the
 * unique index's `UNIQUE_VIOLATION` instead of `SLUG_TAKEN`.
 */
function isSlugTaken(error: unknown): boolean {
  const code = getApiError(error)?.code;
  return code === 'SLUG_TAKEN' || code === 'UNIQUE_VIOLATION';
}

/** The picker's value: the field's colour once it is a valid one. */
function pickerValue(primaryColor: string | null | undefined): string {
  const colour = tenantCreateSchema.shape.primaryColor.safeParse(primaryColor);
  return colour.success && colour.data ? colour.data : PICKER_DEFAULT;
}

// The schema's rules in the admin's words.
function nameError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  return error.type === 'too_small'
    ? 'Enter a name'
    : 'Remove the control characters from the name';
}

function slugError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  switch (error.type) {
    case 'server':
      return error.message;
    // The refinement: a word the web app's own routes use (D-028).
    case 'custom':
      return 'This slug is reserved for the app’s own pages';
    case 'too_big':
      return 'Use at most 63 characters';
    default:
      return 'Use lowercase letters, digits and single hyphens, e.g. adriatic-stays';
  }
}

/**
 * A tenant's configuration (challenge items 10 and 11): name and slug
 * required; logo, primary colour and contact e-mail optional. Without a
 * `tenant` it creates one and opens its page; with one it saves only the
 * fields that changed, a cleared field as `null` (merge patch, D-052).
 */
export function TenantForm({ tenant }: { tenant?: AdminTenant }) {
  const navigate = useNavigate();
  const [createTenant, creation] = useCreateTenantMutation();
  const [updateTenant, update] = useUpdateTenantMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, dirtyFields, isDirty, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(tenantCreateSchema),
    defaultValues: tenant === undefined ? EMPTY_FORM : configurationOf(tenant),
  });
  const [slug, primaryColor] = useWatch({
    control,
    name: ['slug', 'primaryColor'],
  });

  const submit = handleSubmit(async (values) => {
    if (tenant === undefined) {
      const created = await createTenant(values);
      if (created.error === undefined) {
        toast.success(`${created.data.name} created`, {
          description: `Its portal is live at ${portalPath(created.data.slug)}. Add its hosts below.`,
        });
        await navigate(adminTenantPath(created.data.id));
      } else if (isSlugTaken(created.error)) {
        setError('slug', {
          type: 'server',
          message: 'Another tenant already uses this slug',
        });
      }
      return;
    }

    const changes = Object.fromEntries(
      Object.entries(values).filter(
        ([field]) => dirtyFields[field as keyof TenantCreateInput],
      ),
    ) as TenantUpdateInput;
    const saved = await updateTenant({ tenantId: tenant.id, changes });
    if (saved.error === undefined) {
      reset(configurationOf(saved.data));
      toast.success('Tenant saved');
    } else if (isSlugTaken(saved.error)) {
      setError('slug', {
        type: 'server',
        message: 'Another tenant already uses this slug',
      });
    }
  });

  // A taken slug is shown on its field instead.
  const request = tenant === undefined ? creation : update;
  const formError = isSlugTaken(request.error) ? undefined : request.error;
  const slugHint =
    tenant !== undefined && slug !== tenant.slug
      ? `The portal moves here; its old address ${portalPath(tenant.slug)} stops working`
      : 'The portal’s address: lowercase letters, digits and hyphens';

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert error={formError} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Name" error={nameError(errors.name)}>
          {(field) => <Input {...field} {...register('name')} />}
        </FormField>
        <FormField label="Slug" hint={slugHint} error={slugError(errors.slug)}>
          {(field) => (
            <Input
              {...field}
              {...register('slug')}
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        </FormField>
        <FormField
          label="Logo URL"
          hint="Optional; an http(s) address of an image"
          error={
            errors.logoUrl &&
            'Enter an http(s) address, e.g. https://example.com/logo.png'
          }
        >
          {(field) => (
            <Input
              {...field}
              {...register('logoUrl', { setValueAs: blankToNull })}
              type="url"
              inputMode="url"
              placeholder="https://"
            />
          )}
        </FormField>
        <FormField
          label="Contact e-mail"
          hint="Optional; shown on the portal"
          error={errors.contactEmail && 'Enter a valid e-mail address'}
        >
          {(field) => (
            <Input
              {...field}
              {...register('contactEmail', { setValueAs: blankToNull })}
              type="email"
            />
          )}
        </FormField>
        <FormField
          label="Primary colour"
          hint="Optional; the portal’s brand colour as #rrggbb"
          error={
            errors.primaryColor && 'Enter a colour as #rrggbb, e.g. #0e7490'
          }
        >
          {(field) => (
            <div className="flex gap-2">
              <Input
                {...field}
                {...register('primaryColor', { setValueAs: blankToNull })}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="#rrggbb"
              />
              {/* The browser's picker writes the same field. */}
              <input
                type="color"
                aria-label="Pick the primary colour"
                value={pickerValue(primaryColor)}
                onChange={(event) =>
                  setValue('primaryColor', event.target.value, {
                    shouldDirty: true,
                    shouldValidate: isSubmitted,
                  })
                }
                className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
              />
            </div>
          )}
        </FormField>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        {tenant !== undefined && isDirty && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              update.reset();
            }}
            disabled={isSubmitting}
          >
            Discard changes
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || (tenant !== undefined && !isDirty)}
        >
          {tenant === undefined ? 'Create tenant' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
