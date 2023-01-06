using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;

namespace HFportal.Views
{
    public class ClinicianCommitteeRegisterModel : PageModel
    {
        public List<Info> listclinicians = new List<Info>();
      
        public void OnGet()
        {
            try
            {
                string connectionString = "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=HFPORTAL;Integrated Security=True;Encrypt=False;TrustServerCertificate=False;ApplicationIntent=ReadWrite;MultiSubnetFailover=False";
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    string sql = "Select * FROM Clinicians";
                    using (SqlCommand command = new SqlCommand(sql, connection))
                    {
                        using(SqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                Info clinicians = new Info();
                                clinicians.id = reader.GetInt32(0);
                                clinicians.name = reader.GetString(1);
                                clinicians.email = reader.GetString(2);
                                clinicians.phone = reader.GetString(3);
                                clinicians.securityQuestion = reader.GetString(4);
                                clinicians.address = reader.GetString(5);
                                clinicians.prefix = reader.GetString(6);  
                                clinicians.password = reader.GetString(7);
                                clinicians.memberType = reader.GetString(8);
                                
                                listclinicians.Add(clinicians);
                            }
                        }
                    }
                }
            }
            catch(Exception ex)
            {
                Console.WriteLine("Error: "+ex.Message);
            }
        }

        public class Info
        {
            public int id;
            public string name;
            public string email;
            public string phone;
            public string securityQuestion;
            public string address;
            public string prefix;
            public string password;
            public string memberType;
        }
    }
}
