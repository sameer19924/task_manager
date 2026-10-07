import Swal from "sweetalert2";

export const handleUnauthorized = (status) => {
  if (status !== 401) {
    return false;
  }

  localStorage.removeItem("token");

  Swal.fire({
    title: "Error!",
    text: "Your session has expired. Please login again.",
    icon: "error",
    confirmButtonText: "OK",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "/login";
    }
  });

  return true;
};
