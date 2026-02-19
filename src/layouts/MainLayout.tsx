import React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">

            <main className="flex-grow">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
