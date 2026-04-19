import { useState } from 'react';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

function RegisterPage({ onContinue, isSubmitting, errorMessage }) {
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  /** '' = not chosen yet; 'yes' | 'no' */
  const [conditionsAffectUse, setConditionsAffectUse] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [localError, setLocalError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const parsedAge = Number.parseInt(age, 10);

    if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
      setLocalError('Please enter a valid age.');
      return;
    }

    if (conditionsAffectUse === '') {
      setLocalError('Please select Yes or No.');
      return;
    }

    const hasConditions = conditionsAffectUse === 'yes';
    if (hasConditions && !conditionsText.trim()) {
      setLocalError('Please describe your condition(s) or select No.');
      return;
    }

    setLocalError('');
    onContinue({
      age: parsedAge,
      sex,
      conditions_affect_use: hasConditions,
      conditions: hasConditions ? conditionsText.trim() : 'None',
    });
  }

  return (
    <main className="register-main" aria-label="User test registration page">
      <section className="register-card">
        <h1 className="register-title">User Test Registration</h1>
        <div className="register-intro">
          <p>This is a mock version of a software product. Explore the application and its features.</p>
          <p>
            Please analyse the application and note that the user interface will change based on your actions.
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <label className="register-field">
            <span>Age</span>
            <input
              type="number"
              min="1"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="Enter age"
              autoComplete="off"
            />
          </label>

          <fieldset className="register-fieldset">
            <legend>Gender</legend>
            <div className="register-radio-group">
              {GENDER_OPTIONS.map((option) => (
                <label key={option.value} className="register-radio">
                  <input
                    type="radio"
                    name="sex"
                    value={option.value}
                    checked={sex === option.value}
                    onChange={(event) => setSex(event.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="register-fieldset">
            <legend>User has a condition(s) that may affect their use of the product</legend>
            <div className="register-radio-group">
              <label className="register-radio">
                <input
                  type="radio"
                  name="conditionsAffectUse"
                  value="yes"
                  checked={conditionsAffectUse === 'yes'}
                  onChange={() => setConditionsAffectUse('yes')}
                />
                <span>Yes</span>
              </label>
              <label className="register-radio">
                <input
                  type="radio"
                  name="conditionsAffectUse"
                  value="no"
                  checked={conditionsAffectUse === 'no'}
                  onChange={() => setConditionsAffectUse('no')}
                />
                <span>No</span>
              </label>
            </div>
          </fieldset>

          <label className="register-field">
            <span>Conditions (if Yes)</span>
            <textarea
              value={conditionsText}
              onChange={(event) => setConditionsText(event.target.value)}
              placeholder="Describe condition(s) for testing context"
              disabled={conditionsAffectUse !== 'yes'}
              rows={4}
            />
          </label>

          {localError ? <p className="register-error">{localError}</p> : null}
          {errorMessage ? <p className="register-error">{errorMessage}</p> : null}

          <button type="submit" className="register-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;
