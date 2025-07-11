import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../environments/environments";

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getData(endpoint: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${endpoint}`);
  }

  postData(endpoint: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${endpoint}`, data);
  }

  putData(endpoint: string, id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${endpoint}/${id}`, data);
  }

  deleteData(endpoint: string, id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${endpoint}/${id}`);
  }
}