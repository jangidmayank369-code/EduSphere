import { useEffect, useState } from "react";
import {
  createStudent,
  updateStudent,
} from "../../api/students";

const TEXT = {
  en: {
    createTitle: "Add Student",
    editTitle: "Edit Student",
    subtitle: "Enter the student's basic information",
    photo: "Student Photo",
    photoHint: "Clear front-facing photo. This photo will be used for the student profile and ID card.",
    choosePhoto: "Choose Photo",
    changePhoto: "Change Photo",
    removePhoto: "Remove Photo",
    photoTypeError: "Please select JPG, PNG or WebP.",
    photoSizeError: "Photo must be 5 MB or smaller.",
    admissionNumber: "Admission Number",
    rollNumber: "Roll Number",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    dateOfBirth: "Date of Birth",
    gender: "Gender",
    bloodGroup: "Blood Group",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "Postal Code",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    save: "Save Student",
    update: "Update Student",
    cancel: "Cancel",
    saving: "Saving...",
    required: "Required",
    optional: "Optional",
    male: "Male",
    female: "Female",
    other: "Other",
    select: "Select",
    saveFailed: "Unable to save student. Please check the entered details.",
  },

  hi: {
    createTitle: "विद्यार्थी जोड़ें",
    editTitle: "विद्यार्थी संपादित करें",
    subtitle: "विद्यार्थी की मूल जानकारी दर्ज करें",
    photo: "विद्यार्थी का फोटो",
    photoHint: "साफ़ सामने से लिया हुआ फोटो चुनें। यही फोटो प्रोफ़ाइल और ID Card में उपयोग होगा।",
    choosePhoto: "फोटो चुनें",
    changePhoto: "फोटो बदलें",
    removePhoto: "फोटो हटाएँ",
    photoTypeError: "कृपया JPG, PNG या WebP फोटो चुनें।",
    photoSizeError: "फोटो का आकार 5 MB या उससे कम होना चाहिए।",
    admissionNumber: "प्रवेश संख्या",
    rollNumber: "रोल नंबर",
    firstName: "पहला नाम",
    middleName: "मध्य नाम",
    lastName: "उपनाम",
    dateOfBirth: "जन्म तिथि",
    gender: "लिंग",
    bloodGroup: "ब्लड ग्रुप",
    phone: "फोन",
    email: "ईमेल",
    address: "पता",
    city: "शहर",
    state: "राज्य",
    country: "देश",
    postalCode: "पिन कोड",
    status: "स्थिति",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    save: "विद्यार्थी सेव करें",
    update: "विद्यार्थी अपडेट करें",
    cancel: "रद्द करें",
    saving: "सेव हो रहा है...",
    required: "आवश्यक",
    optional: "वैकल्पिक",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    select: "चुनें",
    saveFailed: "विद्यार्थी सेव नहीं हो सका। दर्ज जानकारी जांचें।",
  },
};

const EMPTY_FORM = {
  admission_number: "",
  roll_number: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postal_code: "",
  status: "active",
  is_active: true,
  photo_url: "",
};

function normalizeStudent(student) {
  if (!student) {
    return EMPTY_FORM;
  }

  return {
    admission_number: student.admission_number || "",
    roll_number: student.roll_number || "",
    first_name: student.first_name || "",
    middle_name: student.middle_name || "",
    last_name: student.last_name || "",
    date_of_birth: student.date_of_birth || "",
    gender: student.gender || "",
    blood_group: student.blood_group || "",
    phone: student.phone || "",
    email: student.email || "",
    address: student.address || "",
    city: student.city || "",
    state: student.state || "",
    country: student.country || "India",
    postal_code: student.postal_code || "",
    status: student.status || "active",
    is_active:
      typeof student.is_active === "boolean"
        ? student.is_active
        : true,
  };
}

function Field({
  label,
  required = false,
  children,
  className = "",
}) {
  return (
    <label className={`student-form-field ${className}`}>
      <span className="student-form-label">
        {label}

        {required && (
          <em className="student-form-required">*</em>
        )}
      </span>

      {children}
    </label>
  );
}

export default function StudentForm({
  student = null,
  onSuccess,
  onCancel,
}) {
  const language =
    localStorage.getItem("edusphere-language") === "hi"
      ? "hi"
      : "en";

  const text = TEXT[language];

  const isEdit = Boolean(student?.id);

  const [form, setForm] = useState(
    normalizeStudent(student),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(student?.photo_url || "");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    setForm(normalizeStudent(student));
    setPhotoPreview(student?.photo_url || "");
    setPhotoError("");
    setError("");
  }, [student]);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    setPhotoError("");
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError(text.photoTypeError);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(text.photoSizeError);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoPreview("");
    setPhotoError("");
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.admission_number.trim() ||
      !form.first_name.trim()
    ) {
      setError(
        `${text.admissionNumber} and ${text.firstName} ${text.required}`,
      );
      return;
    }

    saveStudent();
  }

  async function saveStudent() {
    setSaving(true);
    setError("");

    const payload = {
      admission_number: form.admission_number.trim(),
      roll_number: form.roll_number.trim() || null,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim() || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      blood_group: form.blood_group.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || "India",
      postal_code: form.postal_code.trim() || null,
      status: form.status,
      is_active: form.is_active,
      ...(isEdit && form.photo_url ? { photo_url: form.photo_url } : {}),
    };

    try {
      let result;

      if (isEdit) {
        result = await updateStudent(student.id, payload);
      } else {
        result = await createStudent({
          school_id: 1,
          academic_session_id: 1,
          ...payload,
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (requestError) {
      console.error(
        "Student save error:",
        requestError,
      );

      const apiMessage =
        requestError?.response?.data?.detail;

      if (typeof apiMessage === "string") {
        setError(apiMessage);
      } else if (
        Array.isArray(apiMessage) &&
        apiMessage.length > 0
      ) {
        setError(
          apiMessage
            .map((item) => item?.msg)
            .filter(Boolean)
            .join(", "),
        );
      } else {
        setError(text.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="student-form-card">
      <div className="student-form-header">
        <div>
          <span className="student-profile-label">
            EDUSPHERE
          </span>

          <h2>
            {isEdit
              ? text.editTitle
              : text.createTitle}
          </h2>

          <p>{text.subtitle}</p>
        </div>

        {onCancel && (
          <button
            type="button"
            className="student-form-close"
            onClick={onCancel}
            disabled={saving}
            aria-label={text.cancel}
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="student-form-error">
          {error}
        </div>
      )}

      <form
        className="student-form"
        onSubmit={handleSubmit}
      >
        <div className="student-form-section student-form-photo-section">
          <div className="student-form-section-title">{text.photo}</div>
          <div className="student-form-photo-box">
            <div className="student-form-photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt={text.photo} />
              ) : (
                <span aria-hidden="true">👤</span>
              )}
            </div>
            <div className="student-form-photo-content">
              <strong>{text.photo}</strong>
              <p>{text.photoHint}</p>
              <div className="student-form-photo-actions">
                <label className="student-secondary-button student-photo-picker">
                  {photoPreview ? text.changePhoto : text.choosePhoto}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                </label>
                {photoPreview && (
                  <button type="button" className="student-secondary-button" onClick={removePhoto} disabled={saving}>
                    {text.removePhoto}
                  </button>
                )}
              </div>
              {photoError && <div className="student-form-photo-error" role="alert">{photoError}</div>}
            </div>
          </div>
        </div>

        <div className="student-form-section">
          <div className="student-form-section-title">
            {text.createTitle}
          </div>

          <div className="student-form-grid">
            <Field
              label={text.admissionNumber}
              required
            >
              <input
                type="text"
                value={form.admission_number}
                onChange={(event) =>
                  updateField(
                    "admission_number",
                    event.target.value,
                  )
                }
                required
                maxLength={50}
                autoComplete="off"
              />
            </Field>

            <Field label={text.rollNumber}>
              <input
                type="text"
                value={form.roll_number}
                onChange={(event) =>
                  updateField(
                    "roll_number",
                    event.target.value,
                  )
                }
                maxLength={30}
              />
            </Field>

            <Field label={text.firstName} required>
              <input
                type="text"
                value={form.first_name}
                onChange={(event) =>
                  updateField(
                    "first_name",
                    event.target.value,
                  )
                }
                required
                maxLength={100}
              />
            </Field>

            <Field label={text.middleName}>
              <input
                type="text"
                value={form.middle_name}
                onChange={(event) =>
                  updateField(
                    "middle_name",
                    event.target.value,
                  )
                }
                maxLength={100}
              />
            </Field>

            <Field label={text.lastName}>
              <input
                type="text"
                value={form.last_name}
                onChange={(event) =>
                  updateField(
                    "last_name",
                    event.target.value,
                  )
                }
                maxLength={100}
              />
            </Field>

            <Field label={text.dateOfBirth}>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(event) =>
                  updateField(
                    "date_of_birth",
                    event.target.value,
                  )
                }
              />
            </Field>

            <Field label={text.gender}>
              <select
                value={form.gender}
                onChange={(event) =>
                  updateField(
                    "gender",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {text.select}
                </option>
                <option value="male">
                  {text.male}
                </option>
                <option value="female">
                  {text.female}
                </option>
                <option value="other">
                  {text.other}
                </option>
              </select>
            </Field>

            <Field label={text.bloodGroup}>
              <input
                type="text"
                value={form.blood_group}
                onChange={(event) =>
                  updateField(
                    "blood_group",
                    event.target.value,
                  )
                }
                maxLength={10}
              />
            </Field>
          </div>
        </div>

        <div className="student-form-section">
          <div className="student-form-section-title">
            {text.contactInfo}
          </div>

          <div className="student-form-grid">
            <Field label={text.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value,
                  )
                }
                maxLength={20}
              />
            </Field>

            <Field label={text.email}>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value,
                  )
                }
              />
            </Field>

            <Field
              label={text.address}
              className="student-form-field-full"
            >
              <textarea
                value={form.address}
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value,
                  )
                }
                rows={3}
              />
            </Field>

            <Field label={text.city}>
              <input
                type="text"
                value={form.city}
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value,
                  )
                }
                maxLength={100}
              />
            </Field>

            <Field label={text.state}>
              <input
                type="text"
                value={form.state}
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value,
                  )
                }
                maxLength={100}
              />
            </Field>

            <Field label={text.country}>
              <input
                type="text"
                value={form.country}
                onChange={(event) =>
                  updateField(
                    "country",
                    event.target.value,
                  )
                }
                maxLength={100}
              />
            </Field>

            <Field label={text.postalCode}>
              <input
                type="text"
                value={form.postal_code}
                onChange={(event) =>
                  updateField(
                    "postal_code",
                    event.target.value,
                  )
                }
                maxLength={20}
              />
            </Field>
          </div>
        </div>

        <div className="student-form-section">
          <div className="student-form-section-title">
            {text.status}
          </div>

          <div className="student-form-grid">
            <Field label={text.status}>
              <select
                value={form.status}
                onChange={(event) => {
                  const status = event.target.value;

                  updateField("status", status);
                  updateField(
                    "is_active",
                    status === "active",
                  );
                }}
              >
                <option value="active">
                  {text.active}
                </option>

                <option value="inactive">
                  {text.inactive}
                </option>

                <option value="transferred">
                  Transferred
                </option>

                <option value="graduated">
                  Graduated
                </option>

                <option value="left">
                  Left
                </option>

                <option value="suspended">
                  Suspended
                </option>
              </select>
            </Field>
          </div>
        </div>

        <div className="student-form-actions">
          {onCancel && (
            <button
              type="button"
              className="student-secondary-button"
              onClick={onCancel}
              disabled={saving}
            >
              {text.cancel}
            </button>
          )}

          <button
            type="submit"
            className="student-primary-button"
            disabled={saving}
          >
            {saving
              ? text.saving
              : isEdit
                ? text.update
                : text.save}
          </button>
        </div>
      </form>
    </div>
  );
}