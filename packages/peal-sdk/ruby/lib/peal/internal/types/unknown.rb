# frozen_string_literal: true

module Peal
  module Internal
    module Types
      module Unknown
        include Peal::Internal::Types::Type

        def coerce(value)
          value
        end
      end
    end
  end
end
