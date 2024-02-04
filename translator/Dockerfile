FROM python:3.12.1-alpine3.19

RUN mkdir /code

WORKDIR /code

COPY ./translator .

RUN pip install -r requirements.txt

CMD ["uvicorn", "main:app", "--host=0.0.0.0", "--port=5000"]