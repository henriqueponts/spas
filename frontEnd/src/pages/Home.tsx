import axios from 'axios';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
const navigate = useNavigate()
const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/auth/home', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.status !== 200) {
      navigate('/login')
      }
    } catch (err) {
      navigate('/login')
      console.error(err)
    }
  }

  useEffect(() => {
    fetchUser()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [])

  return (
    <div className='text-3x1 text-blue-500'>
      Welcome to the Home Page
    </div>
  )
}

export default Home;