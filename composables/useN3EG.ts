export default function () {
    const text = ref('N3EG')
    const edit = (value: string) => {
        text.value = value
    }
    const reset = () => {
        text.value = 'N3EG'
    }

    return {
        text,
        edit,
        reset
    }
}