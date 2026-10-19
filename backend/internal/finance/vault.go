package finance

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/unix"
)

const MaxDocument = 10 * 1024 * 1024

var ErrObjectExists = errors.New("immutable object exists")

// PrivateVault implementations must enforce immutable opaque keys, private access
// and bounded payloads. This local driver is for private staging, not production object storage.
type PrivateVault interface {
	Put(context.Context, string, []byte) error
	Read(context.Context, string) ([]byte, error)
	Delete(context.Context, string) error
}
type LocalPrivateVault struct{ root string }

func NewLocalPrivateVault(root string) (*LocalPrivateVault, error) {
	if !filepath.IsAbs(root) {
		return nil, fmt.Errorf("absolute private staging root required")
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	info, err := os.Lstat(root)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 || info.Mode().Perm()&0077 != 0 {
		return nil, fmt.Errorf("staging root must be private 0700 and not a symlink")
	}
	return &LocalPrivateVault{root}, nil
}
func documentKey(entity, document string) string {
	return "entity/" + entity + "/document/" + document + "/original"
}
func validDocumentKey(key string) bool {
	s := strings.Split(key, "/")
	return len(s) == 5 && s[0] == "entity" && canonicalUUID(s[1]) && s[2] == "document" && canonicalUUID(s[3]) && s[4] == "original"
}

// Directory-fd walking with O_NOFOLLOW prevents traversal and symlink escapes.
func (v *LocalPrivateVault) parent(key string, create bool) (int, error) {
	if !validDocumentKey(key) {
		return -1, fmt.Errorf("invalid opaque document key")
	}
	fd, err := unix.Open(v.root, unix.O_RDONLY|unix.O_DIRECTORY|unix.O_NOFOLLOW|unix.O_CLOEXEC, 0)
	if err != nil {
		return -1, err
	}
	parts := strings.Split(key, "/")
	for _, part := range parts[:len(parts)-1] {
		if create {
			if err = unix.Mkdirat(fd, part, 0700); err != nil && !errors.Is(err, unix.EEXIST) {
				unix.Close(fd)
				return -1, err
			}
		}
		next, e := unix.Openat(fd, part, unix.O_RDONLY|unix.O_DIRECTORY|unix.O_NOFOLLOW|unix.O_CLOEXEC, 0)
		unix.Close(fd)
		if e != nil {
			return -1, e
		}
		fd = next
	}
	return fd, nil
}
func (v *LocalPrivateVault) Put(ctx context.Context, key string, data []byte) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if len(data) == 0 || len(data) > MaxDocument {
		return fmt.Errorf("invalid document size")
	}
	parent, err := v.parent(key, true)
	if err != nil {
		return err
	}
	defer unix.Close(parent)
	fd, err := unix.Openat(parent, "original", unix.O_WRONLY|unix.O_CREAT|unix.O_EXCL|unix.O_NOFOLLOW|unix.O_CLOEXEC, 0600)
	if errors.Is(err, unix.EEXIST) {
		return ErrObjectExists
	}
	if err != nil {
		return err
	}
	file := os.NewFile(uintptr(fd), "private-document")
	ok := false
	defer func() {
		file.Close()
		if !ok {
			unix.Unlinkat(parent, "original", 0)
		}
	}()
	if _, err = file.Write(data); err != nil {
		return err
	}
	if err = ctx.Err(); err != nil {
		return err
	}
	if err = file.Sync(); err != nil {
		return err
	}
	if err = unix.Fsync(parent); err != nil {
		return err
	}
	ok = true
	return nil
}
func (v *LocalPrivateVault) Read(ctx context.Context, key string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	parent, err := v.parent(key, false)
	if err != nil {
		return nil, err
	}
	defer unix.Close(parent)
	fd, err := unix.Openat(parent, "original", unix.O_RDONLY|unix.O_NOFOLLOW|unix.O_CLOEXEC, 0)
	if err != nil {
		return nil, err
	}
	file := os.NewFile(uintptr(fd), "private-document")
	defer file.Close()
	stat, err := file.Stat()
	if err != nil || !stat.Mode().IsRegular() || stat.Size() > MaxDocument {
		return nil, fmt.Errorf("invalid stored document")
	}
	data := make([]byte, stat.Size())
	_, err = file.ReadAt(data, 0)
	if err != nil {
		return nil, err
	}
	return data, ctx.Err()
}
func (v *LocalPrivateVault) Delete(ctx context.Context, key string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	parent, err := v.parent(key, false)
	if err != nil {
		return err
	}
	defer unix.Close(parent)
	return unix.Unlinkat(parent, "original", 0)
}
