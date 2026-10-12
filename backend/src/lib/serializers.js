export function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: user.birthDate,
    school: user.school,
    role: user.role,
    level: user.level,
    careerField: user.careerField,
    createdAt: user.createdAt,
  };
}

export function authorName(user) {
  return user ? `${user.firstName} ${user.lastName}` : "FutureCoders";
}
