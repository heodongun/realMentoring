// 페이지 로딩 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
  // 페이지별 특화 기능을 구현할 수 있음
  console.log('동물 사진첩이 준비되었습니다!');
  
  // 경고창 자동 닫힘 설정
  const alerts = document.querySelectorAll('.alert-dismissible');
  if (alerts.length > 0) {
    alerts.forEach(alert => {
      setTimeout(() => {
        const closeButton = alert.querySelector('.btn-close');
        if (closeButton) {
          closeButton.click();
        }
      }, 5000); // 5초 후 자동으로 닫힘
    });
  }
});

// 이미지 로딩 오류 처리
function handleImageError(img) {
  img.onerror = null;
  img.src = '/images/placeholder.jpg'; // 이미지 로딩 실패 시 대체 이미지
}