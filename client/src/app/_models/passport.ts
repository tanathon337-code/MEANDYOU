export interface Passport {
    access_token: string,
    display_name: string,
    email?: string,
    avatar_url?: string,
    institution?: string,
    education_level?: string
}

export interface RegisterModel {
    username: string
    password: string
    display_name: string
}
export interface LoginModel {
    username: string
    password: string
}