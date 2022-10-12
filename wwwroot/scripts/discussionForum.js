let btnAdd = document.querySelector('post-btn');
let table = document.querySelector('table');
let postInput = document.querySelector('#description');
        
btnAdd.addEventListener('click', () => {
    let post = postInput.value;
    let date = new Date();
    
    let template = `
            <tr>
                <td>${post}</td>
                <td>${date}</td>
            </tr> `;
    
            table.innerHTML += template;
    
});