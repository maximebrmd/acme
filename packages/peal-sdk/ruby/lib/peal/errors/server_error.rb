# frozen_string_literal: true

module Peal
  module Errors
    class ServerError < ResponseError
    end

    class ServiceUnavailableError < ResponseError
    end
  end
end
