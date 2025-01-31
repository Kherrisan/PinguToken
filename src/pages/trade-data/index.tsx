import React, { useState } from 'react';
import { Input, DatePicker, Select, Table, Tag, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import moment from 'moment';

const TradeData: React.FC = () => {
    const [columns, setColumns] = useState([
        {
            title: '交易ID',
            dataIndex: 'tradeId',
            key: 'tradeId',
            className: 'text-gray-900 dark:text-gray-100',
        },
        {
            title: '交易时间',
            dataIndex: 'tradeTime',
            key: 'tradeTime',
            className: 'text-gray-900 dark:text-gray-100',
            render: (text: string) => moment(text).format('YYYY-MM-DD HH:mm:ss'),
        },
        {
            title: '交易金额',
            dataIndex: 'amount',
            key: 'amount',
            className: 'text-gray-900 dark:text-gray-100',
            render: (text: number) => `¥${text.toFixed(2)}`,
        },
        {
            title: '交易状态',
            dataIndex: 'status',
            key: 'status',
            className: 'text-gray-900 dark:text-gray-100',
            render: (status: string) => (
                <Tag color={status === 'success' ? 'green' : 'red'}>
                    {status === 'success' ? '成功' : '失败'}
                </Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            className: 'text-gray-900 dark:text-gray-100',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="link" onClick={() => handleView(record)}>
                        查看
                    </Button>
                    <Button type="link" onClick={() => handleExport(record)}>
                        导出
                    </Button>
                </Space>
            ),
        },
    ]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-none p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        交易数据
                    </h1>
                </div>

                <div className="flex flex-wrap gap-4">
                    {/* 搜索和筛选控件 */}
                    <Input
                        placeholder="搜索交易..."
                        prefix={<SearchOutlined />}
                        style={{ width: 200 }}
                    />
                    <DatePicker.RangePicker style={{ width: 300 }} />
                    <Select
                        placeholder="交易状态"
                        style={{ width: 120 }}
                        options={[
                            { label: '全部', value: 'all' },
                            { label: '成功', value: 'success' },
                            { label: '失败', value: 'failed' }
                        ]}
                    />
                </div>
            </div>

            <div className="flex-1 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Table
                        columns={columns}
                        dataSource={data}
                        pagination={{
                            total: total,
                            pageSize: pageSize,
                            current: currentPage,
                            onChange: handlePageChange
                        }}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
}; 