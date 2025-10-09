"""
Custom pagination classes for the Survey API.

Provides pagination with metadata including total count, page numbers, etc.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class with page size of 20 and max of 100.

    Returns custom response format with metadata:
    {
        "count": total_count,
        "next": next_page_url,
        "previous": previous_page_url,
        "page": current_page_number,
        "total_pages": total_number_of_pages,
        "page_size": items_per_page,
        "results": [...]
    }
    """

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        """Return custom paginated response with metadata"""
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page', self.page.number),
            ('total_pages', self.page.paginator.num_pages),
            ('page_size', self.page_size),
            ('results', data)
        ]))
