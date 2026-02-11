'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, ChevronUp, ChevronDown, Save, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, MemberRole, MemberLevel, MemberStatus } from '@/types/database'

// 역할 라벨
const roleLabels: Record<MemberRole, string> = {
  leader: '모임장',
  advisor: '고문',
  staff: '운영진',
  member: '회원',
}

const roleColors: Record<MemberRole, string> = {
  leader: 'bg-purple-100 text-purple-800',
  advisor: 'bg-blue-100 text-blue-800',
  staff: 'bg-emerald-100 text-emerald-800',
  member: 'bg-gray-100 text-gray-800',
}

// 실력 라벨
const levelLabels: Record<MemberLevel, string> = {
  rally_x: '랠리X',
  rally_o: '랠리O',
  very_beginner: '왕초심',
  beginner: '초심',
  d_class: 'D조',
  c_class: 'C조',
  b_class: 'B조',
  a_class: 'A조',
}

const levelColors: Record<MemberLevel, string> = {
  rally_x: 'bg-gray-100 text-gray-600',
  rally_o: 'bg-gray-200 text-gray-700',
  very_beginner: 'bg-green-100 text-green-700',
  beginner: 'bg-green-200 text-green-800',
  d_class: 'bg-blue-100 text-blue-700',
  c_class: 'bg-blue-200 text-blue-800',
  b_class: 'bg-yellow-100 text-yellow-800',
  a_class: 'bg-red-100 text-red-800',
}

// 상태 라벨
const statusLabels: Record<MemberStatus, string> = {
  active: '활동',
  left: '탈퇴',
  kicked: '강퇴',
}

const statusColors: Record<MemberStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  left: 'bg-gray-100 text-gray-600',
  kicked: 'bg-red-100 text-red-800',
}

type SortField = 'name' | 'nickname' | 'role' | 'join_date' | 'phone' | 'level' | 'status'
type SortOrder = 'asc' | 'desc'

type NewMemberRow = {
  tempId: string
  name: string
  nickname: string
  role: MemberRole
  join_date: string
  phone: string
  level: MemberLevel
  status: MemberStatus
}

export default function MembersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all')

  // 인라인 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Member>>({})

  // 신규 행 추가 상태 (여러 행)
  const [newRows, setNewRows] = useState<NewMemberRow[]>([])

  const supabase = createClient()

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // 회원 목록 조회
  const fetchMembers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching members:', error)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  // 정렬
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드 클릭: asc → desc → 기본정렬(null)
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortField(null)
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="w-4" />
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
  }

  // 역할 우선순위: 모임장 > 고문 > 운영진 > 회원
  const roleOrder: Record<MemberRole, number> = {
    leader: 1,
    advisor: 2,
    staff: 3,
    member: 4,
  }

  // 정렬된 회원 목록
  const sortedMembers = [...members]
    .filter(member => {
      // 상태 필터
      if (statusFilter !== 'all' && member.status !== statusFilter) return false
      // 검색 필터
      return member.name.includes(searchTerm) ||
        (member.nickname && member.nickname.includes(searchTerm)) ||
        (member.phone && member.phone.includes(searchTerm))
    })
    .sort((a, b) => {
      // 사용자가 특정 필드로 정렬 선택한 경우
      if (sortField) {
        let aVal: string | number = a[sortField] || ''
        let bVal: string | number = b[sortField] || ''

        // 역할 정렬은 우선순위 숫자로 비교
        if (sortField === 'role') {
          aVal = roleOrder[a.role]
          bVal = roleOrder[b.role]
        }

        let compare = 0
        if (sortOrder === 'asc') {
          compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        } else {
          compare = aVal > bVal ? -1 : aVal < bVal ? 1 : 0
        }

        // 같은 값이면 가입일로 2차 정렬
        if (compare === 0) {
          return (a.join_date || '').localeCompare(b.join_date || '')
        }
        return compare
      }

      // 기본 정렬: 역할 우선순위 → 가입일 빠른 순
      const roleCompare = roleOrder[a.role] - roleOrder[b.role]
      if (roleCompare !== 0) return roleCompare

      // 가입일 비교 (빠른 순 = 오래된 순)
      return (a.join_date || '').localeCompare(b.join_date || '')
    })

  // 신규 행 추가
  const addNewRow = () => {
    const newRow: NewMemberRow = {
      tempId: `temp-${Date.now()}`,
      name: '',
      nickname: '',
      role: 'member',
      join_date: getTodayDate(),
      phone: '',
      level: 'beginner',
      status: 'active',
    }
    setNewRows([...newRows, newRow])
  }

  // 신규 행 데이터 변경
  const updateNewRow = (tempId: string, field: keyof NewMemberRow, value: string) => {
    setNewRows(newRows.map(row =>
      row.tempId === tempId ? { ...row, [field]: value } : row
    ))
  }

  // 단일 신규 행 저장
  const saveNewRow = async (tempId: string) => {
    const row = newRows.find(r => r.tempId === tempId)
    if (!row) return

    if (!row.name.trim()) {
      alert('이름을 입력하세요.')
      return
    }

    const { error } = await supabase
      .from('members')
      .insert([{
        name: row.name,
        nickname: row.nickname || null,
        role: row.role,
        join_date: row.join_date,
        phone: row.phone || null,
        level: row.level,
        status: row.status,
      }])

    if (error) {
      alert('등록 실패: ' + error.message)
      return
    }

    setNewRows(newRows.filter(r => r.tempId !== tempId))
    fetchMembers()
  }

  // 모든 신규 행 저장
  const saveAllNewRows = async () => {
    const validRows = newRows.filter(row => row.name.trim())
    if (validRows.length === 0) {
      alert('저장할 데이터가 없습니다.')
      return
    }

    const insertData = validRows.map(row => ({
      name: row.name,
      nickname: row.nickname || null,
      role: row.role,
      join_date: row.join_date,
      phone: row.phone || null,
      level: row.level,
      status: row.status,
    }))

    const { error } = await supabase
      .from('members')
      .insert(insertData)

    if (error) {
      alert('등록 실패: ' + error.message)
      return
    }

    setNewRows([])
    fetchMembers()
  }

  // 신규 행 삭제
  const removeNewRow = (tempId: string) => {
    setNewRows(newRows.filter(r => r.tempId !== tempId))
  }

  // 인라인 편집 시작
  const startEdit = (member: Member) => {
    if (editingId) return
    setEditingId(member.id)
    setEditData({
      name: member.name,
      nickname: member.nickname || '',
      role: member.role,
      join_date: member.join_date,
      phone: member.phone || '',
      level: member.level,
      status: member.status,
    })
  }

  // 인라인 편집 저장
  const handleSave = async (id: string) => {
    if (!editData.name?.trim()) {
      alert('이름을 입력하세요.')
      return
    }

    const { error } = await supabase
      .from('members')
      .update(editData)
      .eq('id', id)

    if (error) {
      alert('수정 실패: ' + error.message)
      return
    }

    setEditingId(null)
    setEditData({})
    fetchMembers()
  }

  // 편집 취소
  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  // 회원 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)

    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }

    fetchMembers()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">회원관리</h1>

      {/* 통계 카드 (클릭하면 필터 적용) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-gray-400' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <p className="text-sm text-gray-500">전체 회원</p>
          <p className="text-2xl font-bold text-gray-800">{members.length}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${statusFilter === 'active' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          <p className="text-sm text-gray-500">활동 회원</p>
          <p className="text-2xl font-bold text-emerald-600">{members.filter(m => m.status === 'active').length}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${statusFilter === 'left' ? 'ring-2 ring-gray-400' : ''}`}
          onClick={() => setStatusFilter('left')}
        >
          <p className="text-sm text-gray-500">탈퇴</p>
          <p className="text-2xl font-bold text-gray-400">{members.filter(m => m.status === 'left').length}명</p>
        </div>
        <div
          className={`card text-center cursor-pointer transition-all hover:shadow-md ${statusFilter === 'kicked' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setStatusFilter('kicked')}
        >
          <p className="text-sm text-gray-500">강퇴</p>
          <p className="text-2xl font-bold text-red-400">{members.filter(m => m.status === 'kicked').length}명</p>
        </div>
      </div>

      {/* 검색 + 버튼 */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
          <input
            type="text"
            placeholder="이름 또는 연락처로 검색..."
            className="w-full py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            style={{ paddingLeft: '48px', paddingRight: '12px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {newRows.length > 0 && (
            <button
              onClick={saveAllNewRows}
              className="btn btn-primary flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
            >
              <Check size={18} />
              <span className="hidden md:inline">전체 저장</span>
              <span className="md:hidden">저장</span>
              ({newRows.filter(r => r.name.trim()).length})
            </button>
          )}
          <button
            onClick={addNewRow}
            className="btn btn-secondary flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
          >
            <Plus size={18} />
            <span className="hidden md:inline">회원등록</span>
            <span className="md:hidden">추가</span>
          </button>
        </div>
      </div>

      {/* 회원 목록 */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="table-container overflow-auto max-h-[calc(100vh-350px)] md:max-h-[calc(100vh-400px)]">
            <table className="table">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">이름 <SortIcon field="name" /></div>
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('nickname')}>
                    <div className="flex items-center gap-1">닉네임 <SortIcon field="nickname" /></div>
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('role')}>
                    <div className="flex items-center gap-1">역할 <SortIcon field="role" /></div>
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('join_date')}>
                    <div className="flex items-center gap-1">가입일 <SortIcon field="join_date" /></div>
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('phone')}>
                    <div className="flex items-center gap-1">연락처 <SortIcon field="phone" /></div>
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('level')}>
                    <div className="flex items-center gap-1">실력 <SortIcon field="level" /></div>
                  </th>
                  <th className="cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">상태 <SortIcon field="status" /></div>
                  </th>
                  <th className="w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {/* 신규 행들 */}
                {newRows.map((row, index) => (
                  <tr key={row.tempId} className="bg-emerald-50">
                    <td>
                      <input
                        type="text"
                        className="input py-1 text-sm"
                        placeholder="이름 *"
                        value={row.name}
                        onChange={(e) => updateNewRow(row.tempId, 'name', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveNewRow(row.tempId)}
                        autoFocus={index === newRows.length - 1}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input py-1 text-sm"
                        placeholder="닉네임"
                        value={row.nickname}
                        onChange={(e) => updateNewRow(row.tempId, 'nickname', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="input py-1 text-sm"
                        value={row.role}
                        onChange={(e) => updateNewRow(row.tempId, 'role', e.target.value)}
                      >
                        <option value="leader">모임장</option>
                        <option value="advisor">고문</option>
                        <option value="staff">운영진</option>
                        <option value="member">회원</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        className="input py-1 text-sm"
                        value={row.join_date}
                        onChange={(e) => updateNewRow(row.tempId, 'join_date', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input py-1 text-sm"
                        placeholder="010-0000-0000"
                        value={row.phone}
                        onChange={(e) => updateNewRow(row.tempId, 'phone', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="input py-1 text-sm"
                        value={row.level}
                        onChange={(e) => updateNewRow(row.tempId, 'level', e.target.value)}
                      >
                        <option value="rally_x">랠리X</option>
                        <option value="rally_o">랠리O</option>
                        <option value="very_beginner">왕초심</option>
                        <option value="beginner">초심</option>
                        <option value="d_class">D조</option>
                        <option value="c_class">C조</option>
                        <option value="b_class">B조</option>
                        <option value="a_class">A조</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="input py-1 text-sm"
                        value={row.status}
                        onChange={(e) => updateNewRow(row.tempId, 'status', e.target.value)}
                      >
                        <option value="active">활동</option>
                        <option value="left">탈퇴</option>
                        <option value="kicked">강퇴</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => saveNewRow(row.tempId)} className="p-1 text-emerald-600 hover:text-emerald-700" title="저장">
                          <Save size={18} />
                        </button>
                        <button onClick={() => removeNewRow(row.tempId)} className="p-1 text-gray-500 hover:text-gray-700" title="취소">
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* 기존 회원 목록 */}
                {sortedMembers.length === 0 && newRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      {members.length === 0 ? '등록된 회원이 없습니다. "행 추가" 버튼을 눌러 회원을 등록하세요.' : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  sortedMembers.map((member) => (
                    <tr
                      key={member.id}
                      className={editingId === member.id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      onDoubleClick={() => !editingId && startEdit(member)}
                    >
                      {editingId === member.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              className="input py-1 text-sm"
                              value={editData.name || ''}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave(member.id)}
                              autoFocus
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input py-1 text-sm"
                              value={editData.nickname || ''}
                              onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              className="input py-1 text-sm"
                              value={editData.role || 'member'}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value as MemberRole })}
                            >
                              <option value="leader">모임장</option>
                              <option value="advisor">고문</option>
                              <option value="staff">운영진</option>
                              <option value="member">회원</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="date"
                              className="input py-1 text-sm"
                              value={editData.join_date || ''}
                              onChange={(e) => setEditData({ ...editData, join_date: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input py-1 text-sm"
                              value={editData.phone || ''}
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave(member.id)}
                            />
                          </td>
                          <td>
                            <select
                              className="input py-1 text-sm"
                              value={editData.level || 'beginner'}
                              onChange={(e) => setEditData({ ...editData, level: e.target.value as MemberLevel })}
                            >
                              <option value="rally_x">랠리X</option>
                              <option value="rally_o">랠리O</option>
                              <option value="very_beginner">왕초심</option>
                              <option value="beginner">초심</option>
                              <option value="d_class">D조</option>
                              <option value="c_class">C조</option>
                              <option value="b_class">B조</option>
                              <option value="a_class">A조</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="input py-1 text-sm"
                              value={editData.status || 'active'}
                              onChange={(e) => setEditData({ ...editData, status: e.target.value as MemberStatus })}
                            >
                              <option value="active">활동</option>
                              <option value="left">탈퇴</option>
                              <option value="kicked">강퇴</option>
                            </select>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleSave(member.id)} className="p-1 text-emerald-600 hover:text-emerald-700" title="저장">
                                <Save size={18} />
                              </button>
                              <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-700" title="취소">
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="font-medium cursor-pointer" onClick={() => startEdit(member)}>{member.name}</td>
                          <td className="cursor-pointer" onClick={() => startEdit(member)}>{member.nickname || '-'}</td>
                          <td className="cursor-pointer" onClick={() => startEdit(member)}>
                            <span className={`badge ${roleColors[member.role]}`}>{roleLabels[member.role]}</span>
                          </td>
                          <td className="cursor-pointer" onClick={() => startEdit(member)}>{member.join_date}</td>
                          <td className="cursor-pointer" onClick={() => startEdit(member)}>{member.phone || '-'}</td>
                          <td className="cursor-pointer" onClick={() => startEdit(member)}>
                            <span className={`badge ${levelColors[member.level]}`}>{levelLabels[member.level]}</span>
                          </td>
                          <td className="cursor-pointer" onClick={() => startEdit(member)}>
                            <span className={`badge ${statusColors[member.status]}`}>{statusLabels[member.status]}</span>
                          </td>
                          <td>
                            <button onClick={() => handleDelete(member.id)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="text-xs md:text-sm text-gray-500 hidden md:block">
        💡 카드 클릭 → 필터 적용 | 행 클릭 → 바로 수정 | "회원등록" 여러 번 → 동시 입력 | Enter → 저장 | 헤더 클릭 → 정렬
      </div>
    </div>
  )
}
