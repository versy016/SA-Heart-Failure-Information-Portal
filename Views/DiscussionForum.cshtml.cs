using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;

namespace HFportal.Views
{
    public class DiscussionForumModel : PageModel
    {
        public void OnGet()
        {
            try
            {
                string connectionString = "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=HFPORTAL;Integrated Security=True";
                using(SqlConnection connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    string sql = "SELECT * FROM clients";
                    using(SqlCommand command = connection.CreateCommand())
                    {
                        using(SqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                ForumInfo forum = new ForumInfo();
                                forum.Author = reader.GetString(1);
                                forum.Name = reader.GetString(2);
                            }
                        }
                    }
                }
            }
            catch (Exception)
            {

                throw;
            }
        }
    }

    public class ForumInfo
    {
        public int id;
        public string Subject;
        public string Name;
        public string Author;
        public string Title;
        public string post;
        public DateTime dateTime;
        public string reply;

    }
}
