export type StaffData = {
    id?: number;
    name?: string|null|undefined;
    email?: string|null|undefined;
    STAFFID?: number;
    PREFIXID?: string;
    STAFFNAME?: string;
    STAFFSURNAME?: string;
    GENDERID?: string;
    STAFFEMAIL1?: string;
    STAFFEMAIL2?: string;
    POSID?: string;
    STAFFFACULTY?: string;
    POSTYPEID?: string;
    POSTYPENAME?: string;
    GROUPTYPENAME?: string;
    SCOPES?: {
      progcode?: string;
      groupid?: string;
      groupname?: string;
      staffdepartment?: string;
      staffdepartmentname?: string;
    };
    PREFIXFULLNAME?: string;
    POSITIONNAME?: string;
    role?: string;
};
