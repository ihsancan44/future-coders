import React, { useState } from 'react'; 
import { Outlet } from "react-router-dom";
import Navbar from './navbar/navbar';
import Footer from './footer/footer';



export default function MainLayout () {

    return (
       <div className="container">
            <Navbar/>
            <Outlet/>
        </div>
    )
}