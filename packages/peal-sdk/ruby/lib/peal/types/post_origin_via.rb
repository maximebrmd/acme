# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostOriginVia
      extend Peal::Internal::Types::Enum

      WEB = "web"
      API_KEY = "apiKey"
      APPLICATION = "application"
    end
  end
end
